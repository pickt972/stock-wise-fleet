-- Inventaires : colonnes du nouveau workflow
ALTER TABLE public.inventaires
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS scope_id uuid,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS abandoned_by uuid,
  ADD COLUMN IF NOT EXISTS abandon_reason text,
  ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_articles integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS articles_counted integer NOT NULL DEFAULT 0;

ALTER TABLE public.inventaires ALTER COLUMN date_inventaire SET DEFAULT current_date;
ALTER TABLE public.inventaires ALTER COLUMN location SET DEFAULT 'CARRERE';
ALTER TABLE public.inventaires DROP CONSTRAINT IF EXISTS inventaires_date_inventaire_key;
ALTER TABLE public.inventaires DROP CONSTRAINT IF EXISTS inventaires_statut_check;
ALTER TABLE public.inventaires ADD CONSTRAINT inventaires_statut_check
  CHECK (statut IN ('en_cours','cloture','valide','abandonne'));
ALTER TABLE public.inventaires ADD CONSTRAINT inventaires_scope_type_check
  CHECK (scope_type IN ('all','category','location'));

CREATE UNIQUE INDEX IF NOT EXISTS inventaires_reference_key ON public.inventaires(reference) WHERE reference IS NOT NULL;
-- Un seul inventaire en cours à la fois
CREATE UNIQUE INDEX IF NOT EXISTS inventaires_single_open ON public.inventaires((true)) WHERE statut = 'en_cours';
CREATE UNIQUE INDEX IF NOT EXISTS inventaire_items_inv_article_key ON public.inventaire_items(inventaire_id, article_id);
CREATE INDEX IF NOT EXISTS idx_inventaire_items_inventaire_id ON public.inventaire_items(inventaire_id);

-- Ouverture
CREATE OR REPLACE FUNCTION public.open_inventory(p_label text, p_scope_type text, p_scope_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid(); v_id uuid; v_ref text; v_seq int; v_year text := to_char(now(),'YYYY');
  v_cat record; v_total int;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  IF EXISTS (SELECT 1 FROM inventaires WHERE statut='en_cours') THEN
    RAISE EXCEPTION 'Un inventaire est déjà en cours. Clôturez-le ou abandonnez-le avant d''en ouvrir un nouveau.'; END IF;
  IF p_scope_type NOT IN ('all','category','location') THEN RAISE EXCEPTION 'Périmètre invalide'; END IF;
  IF p_scope_type <> 'all' AND p_scope_id IS NULL THEN RAISE EXCEPTION 'Périmètre à préciser'; END IF;

  SELECT COALESCE(MAX(NULLIF(split_part(reference,'-',3),'')::int),0)+1 INTO v_seq
    FROM inventaires WHERE reference LIKE 'INV-'||v_year||'-%';
  v_ref := 'INV-'||v_year||'-'||lpad(v_seq::text,3,'0');

  INSERT INTO inventaires(reference,label,scope_type,scope_id,statut,status,created_by,started_by,opened_at,started_at,date_inventaire)
  VALUES (v_ref, NULLIF(trim(p_label),''), p_scope_type, p_scope_id,'en_cours','OPEN',v_uid,v_uid,now(),now(),current_date)
  RETURNING id INTO v_id;

  IF p_scope_type = 'category' THEN
    SELECT c.nom, c.parent_id INTO v_cat FROM categories c WHERE c.id = p_scope_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catégorie introuvable'; END IF;
  END IF;

  INSERT INTO inventaire_items(inventaire_id, article_id, stock_theorique, emplacement_id, created_by)
  SELECT v_id, a.id, a.stock, a.emplacement_id, v_uid FROM articles a
  WHERE a.archived_at IS NULL
    AND (p_scope_type = 'all'
      OR (p_scope_type = 'location' AND a.emplacement_id = p_scope_id)
      OR (p_scope_type = 'category' AND (
            (v_cat.parent_id IS NULL AND a.categorie = v_cat.nom)
         OR (v_cat.parent_id IS NOT NULL AND a.sous_categorie = v_cat.nom))));
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total = 0 THEN RAISE EXCEPTION 'Aucun article dans ce périmètre'; END IF;
  UPDATE inventaires SET total_articles = v_total WHERE id = v_id;
  PERFORM log_audit('INVENTORY_OPEN','inventaires',v_id,NULL,jsonb_build_object('reference',v_ref,'scope_type',p_scope_type,'total',v_total));
  RETURN v_id;
END $$;

-- Saisie d'un comptage (NULL = effacer)
CREATE OR REPLACE FUNCTION public.set_inventory_count(p_item_id uuid, p_qty integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_inv uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  IF p_qty IS NOT NULL AND p_qty < 0 THEN RAISE EXCEPTION 'Quantité négative interdite'; END IF;
  SELECT i.inventaire_id INTO v_inv FROM inventaire_items i JOIN inventaires v ON v.id=i.inventaire_id
   WHERE i.id = p_item_id AND v.statut='en_cours';
  IF v_inv IS NULL THEN RAISE EXCEPTION 'Inventaire non modifiable'; END IF;
  UPDATE inventaire_items SET stock_compte = p_qty,
    ecart = CASE WHEN p_qty IS NULL THEN NULL ELSE p_qty - stock_theorique END,
    counted_by = CASE WHEN p_qty IS NULL THEN NULL ELSE v_uid END,
    date_comptage = CASE WHEN p_qty IS NULL THEN NULL ELSE now() END
   WHERE id = p_item_id;
  UPDATE inventaires SET articles_counted = (SELECT count(*) FROM inventaire_items WHERE inventaire_id=v_inv AND stock_compte IS NOT NULL)
   WHERE id = v_inv;
END $$;

-- Clôture (avec ajustement optionnel du stock)
CREATE OR REPLACE FUNCTION public.close_inventory_session(p_inventaire_id uuid, p_apply_to_stock boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ref text; it record; v_n int := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  SELECT reference INTO v_ref FROM inventaires WHERE id=p_inventaire_id AND statut='en_cours' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventaire non ouvert'; END IF;

  IF p_apply_to_stock THEN
    FOR it IN SELECT article_id, ecart FROM inventaire_items
              WHERE inventaire_id=p_inventaire_id AND stock_compte IS NOT NULL AND ecart <> 0 LOOP
      UPDATE articles SET stock = GREATEST(stock + it.ecart, 0), updated_at=now() WHERE id = it.article_id;
      INSERT INTO stock_movements(article_id,type,quantity,motif,user_id,created_by)
      VALUES (it.article_id, CASE WHEN it.ecart>0 THEN 'entree' ELSE 'sortie' END, abs(it.ecart),
              'Ajustement inventaire '||COALESCE(v_ref,''), v_uid, v_uid);
      v_n := v_n + 1;
    END LOOP;
  END IF;

  UPDATE inventaires SET statut='cloture', status='CLOSED', closed_at=now(), date_cloture=now(),
    closed_by=v_uid, stock_applied=p_apply_to_stock
   WHERE id=p_inventaire_id;
  PERFORM log_audit('INVENTORY_CLOSE','inventaires',p_inventaire_id,NULL,
    jsonb_build_object('reference',v_ref,'stock_applied',p_apply_to_stock,'adjusted_articles',v_n));
END $$;

-- Abandon
CREATE OR REPLACE FUNCTION public.abandon_inventory(p_inventaire_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ref text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  UPDATE inventaires SET statut='abandonne', status='CLOSED', abandoned_at=now(), abandoned_by=v_uid,
    abandon_reason=NULLIF(trim(p_reason),'')
   WHERE id=p_inventaire_id AND statut='en_cours' RETURNING reference INTO v_ref;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventaire non ouvert'; END IF;
  PERFORM log_audit('INVENTORY_ABANDON','inventaires',p_inventaire_id,NULL,jsonb_build_object('reference',v_ref,'reason',p_reason));
END $$;

REVOKE ALL ON FUNCTION public.open_inventory(text,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_inventory_count(uuid,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_inventory_session(uuid,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.abandon_inventory(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_inventory(text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_inventory_count(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_inventory_session(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_inventory(uuid,text) TO authenticated;