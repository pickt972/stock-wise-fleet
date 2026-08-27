-- 1. Table de réglages applicatifs
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
CREATE POLICY "app_settings_select_authenticated"
ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
CREATE POLICY "app_settings_update_admin"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "app_settings_insert_admin" ON public.app_settings;
CREATE POLICY "app_settings_insert_admin"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
VALUES ('maintenance', '{"active": false, "message": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Realtime pour propagation immédiate
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2. Fonction de verrou
CREATE OR REPLACE FUNCTION public.is_maintenance()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((value->>'active')::boolean, false)
  FROM public.app_settings
  WHERE key = 'maintenance'
$function$;

REVOKE EXECUTE ON FUNCTION public.is_maintenance() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_maintenance() TO authenticated;

-- 3. Verrou d'écriture sur les tables métier (politiques RESTRICTIVE additives)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'articles','categories','commandes','commande_items','emplacements','fournisseurs',
    'vehicules','article_vehicules','article_fournisseurs','accessoires','accessoire_transferts',
    'inventaires','inventaire_items','stock_entries','stock_entry_items','stock_exits',
    'stock_exit_items','stock_movements','subcategory_stock_thresholds'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'maintenance_block_insert', t);
    EXECUTE format($f$
      CREATE POLICY maintenance_block_insert ON public.%I
      AS RESTRICTIVE FOR INSERT
      WITH CHECK (NOT public.is_maintenance() OR public.has_role(auth.uid(), 'admin'::app_role))
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'maintenance_block_update', t);
    EXECUTE format($f$
      CREATE POLICY maintenance_block_update ON public.%I
      AS RESTRICTIVE FOR UPDATE
      USING (NOT public.is_maintenance() OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (NOT public.is_maintenance() OR public.has_role(auth.uid(), 'admin'::app_role))
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'maintenance_block_delete', t);
    EXECUTE format($f$
      CREATE POLICY maintenance_block_delete ON public.%I
      AS RESTRICTIVE FOR DELETE
      USING (NOT public.is_maintenance() OR public.has_role(auth.uid(), 'admin'::app_role))
    $f$, t);
  END LOOP;
END $$;

-- 4. Verrou dans les fonctions SECURITY DEFINER qui écrivent (elles contournent la RLS)
CREATE OR REPLACE FUNCTION public.insert_stock_movement(p_article_id uuid, p_type text, p_quantity integer, p_motif text DEFAULT 'Mouvement rapide'::text, p_vehicule_id uuid DEFAULT NULL::uuid, p_fournisseur_id uuid DEFAULT NULL::uuid, p_site_id text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_movement_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF public.is_maintenance() AND NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;

  IF p_type NOT IN ('entree', 'sortie') THEN
    RAISE EXCEPTION 'Type de mouvement invalide : %', p_type;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantité doit être positive';
  END IF;

  INSERT INTO public.stock_movements (
    article_id, type, quantity, motif,
    user_id, created_by,
    vehicule_id, fournisseur_id, site_id
  )
  VALUES (
    p_article_id, p_type, p_quantity, COALESCE(p_motif, 'Mouvement rapide'),
    v_user_id, v_user_id,
    p_vehicule_id, p_fournisseur_id, p_site_id
  )
  RETURNING id INTO v_movement_id;

  UPDATE public.articles
  SET stock = stock + CASE WHEN p_type = 'entree' THEN p_quantity ELSE -p_quantity END,
      updated_at = now()
  WHERE id = p_article_id;

  IF (SELECT stock FROM public.articles WHERE id = p_article_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuffisant pour cette sortie';
  END IF;

  RETURN v_movement_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_article_stock(article_id uuid, quantity_change integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_maintenance() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;

  UPDATE public.articles
  SET stock = stock + quantity_change,
      updated_at = now()
  WHERE id = article_id;

  IF (SELECT stock FROM public.articles WHERE id = article_id) < 0 THEN
    RAISE EXCEPTION 'Le stock ne peut pas être négatif';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.scan_item(p_inventaire_id uuid, p_barcode text, p_delta integer DEFAULT 1)
RETURNS TABLE(item_id uuid, qty integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_loc public.location_enum;
  v_item uuid;
begin
  if public.is_maintenance() and not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'maintenance_mode: écritures temporairement désactivées';
  end if;

  if not exists (select 1 from public.inventaires
                 where id = p_inventaire_id and status = 'OPEN') then
    raise exception 'Inventory is not OPEN';
  end if;

  select location into v_loc from public.inventaires where id = p_inventaire_id;

  select id into v_item
  from public.inventaire_items
  where inventaire_id = p_inventaire_id and barcode = p_barcode
  limit 1;

  if v_item is null then
    insert into public.inventaire_items(inventaire_id, barcode, qty, location, created_by)
    values (p_inventaire_id, p_barcode, greatest(p_delta,0), v_loc, auth.uid())
    returning id into v_item;
    return query
      select v_item, qty from public.inventaire_items where id = v_item;
  else
    update public.inventaire_items
       set qty = greatest(qty + p_delta, 0)
     where id = v_item
     returning id, qty into v_item, qty;
    return query
      select v_item, qty;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_inventory(loc location_enum)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  inv_id uuid;
begin
  if public.is_maintenance() and not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'maintenance_mode: écritures temporairement désactivées';
  end if;

  select id into inv_id
  from public.inventaires
  where location = loc and status = 'OPEN'
  order by started_at desc
  limit 1;

  if inv_id is not null then
    return inv_id;
  end if;

  insert into public.inventaires(location, status, started_by)
  values (loc, 'OPEN', auth.uid())
  returning id into inv_id;

  return inv_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.close_inventory(p_inventaire_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_maintenance() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;

  UPDATE public.inventaires
     SET status = 'CLOSED', closed_at = now()
   WHERE id = p_inventaire_id AND status = 'OPEN';
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_category(_category_id uuid, _new_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cursor uuid;
  v_max_order integer;
BEGIN
  IF public.is_maintenance() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;

  IF _category_id = _new_parent_id THEN
    RAISE EXCEPTION 'Une catégorie ne peut pas être son propre parent';
  END IF;

  IF _new_parent_id IS NOT NULL THEN
    v_cursor := _new_parent_id;
    WHILE v_cursor IS NOT NULL LOOP
      IF v_cursor = _category_id THEN
        RAISE EXCEPTION 'Cycle détecté : impossible d''imbriquer une catégorie sous l''un de ses descendants';
      END IF;
      SELECT parent_id INTO v_cursor FROM public.categories WHERE id = v_cursor;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_order
  FROM public.categories
  WHERE COALESCE(parent_id::text, '') = COALESCE(_new_parent_id::text, '');

  UPDATE public.categories
     SET parent_id = _new_parent_id,
         sort_order = v_max_order,
         updated_at = now()
   WHERE id = _category_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_categories(_parent_id uuid, _ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i integer;
BEGIN
  IF public.is_maintenance() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = ANY(_ordered_ids)
      AND COALESCE(parent_id::text, '') <> COALESCE(_parent_id::text, '')
  ) THEN
    RAISE EXCEPTION 'Toutes les catégories doivent avoir le même parent';
  END IF;

  IF (SELECT COUNT(DISTINCT x) FROM unnest(_ordered_ids) AS x) <> array_length(_ordered_ids, 1) THEN
    RAISE EXCEPTION 'Doublons détectés dans la liste ordonnée';
  END IF;

  FOR i IN 1 .. array_length(_ordered_ids, 1) LOOP
    UPDATE public.categories
       SET sort_order = -1 * i,
           updated_at = now()
     WHERE id = _ordered_ids[i];
  END LOOP;

  FOR i IN 1 .. array_length(_ordered_ids, 1) LOOP
    UPDATE public.categories
       SET sort_order = i - 1,
           updated_at = now()
     WHERE id = _ordered_ids[i];
  END LOOP;
END;
$function$;
