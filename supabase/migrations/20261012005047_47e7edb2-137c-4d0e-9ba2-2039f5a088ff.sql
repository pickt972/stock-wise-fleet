CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid
    AND role IN ('admin','chef_agence','magasinier'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('accessoire_transferts','Authenticated can view transfers'),
    ('accessoires','Authenticated can view accessoires'),
    ('app_settings','app_settings_select_authenticated'),
    ('article_fournisseurs','Authenticated users can view article suppliers'),
    ('article_vehicules','Authenticated users can view article vehicles'),
    ('articles','Authenticated users can view articles'),
    ('categories','Authenticated users can view categories'),
    ('commande_items','Authenticated users can view order items'),
    ('emplacements','Authenticated users can view locations'),
    ('inventaire_items','Authenticated users can view inventory items'),
    ('inventaires','Authenticated users can view inventories'),
    ('role_permissions','Utilisateurs peuvent voir les permissions'),
    ('stock_entries','Les utilisateurs authentifiés peuvent voir les entrées'),
    ('stock_entry_items','Les utilisateurs authentifiés peuvent voir les items'),
    ('stock_exit_items','Les utilisateurs authentifiés peuvent voir les items'),
    ('stock_exit_items','stock_exit_items_select_auth'),
    ('stock_exits','Les utilisateurs authentifiés peuvent voir les sorties'),
    ('stock_movements','Authenticated users can view stock movements'),
    ('subcategory_stock_thresholds','Authenticated can view thresholds'),
    ('vehicules','Authenticated users can view vehicles')
  ) AS t(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
  END LOOP;

  FOR r IN SELECT unnest(ARRAY['accessoire_transferts','accessoires','app_settings','article_fournisseurs','article_vehicules','articles','categories','commande_items','emplacements','inventaire_items','inventaires','role_permissions','stock_entries','stock_entry_items','stock_exit_items','stock_exits','stock_movements','subcategory_stock_thresholds','vehicules']) AS tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_select ON public.%I', r.tbl);
    EXECUTE format('CREATE POLICY staff_select ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', r.tbl);
  END LOOP;
END $$;