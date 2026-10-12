DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND roles = '{public}'
      AND policyname NOT LIKE 'maintenance_block_%'
      AND tablename IN ('accessoire_transferts','accessoires','article_fournisseurs','article_vehicules','articles','audit_logs','categories','color_preferences','commande_items','commandes','company_settings','emplacements','fournisseurs','inventaire_items','inventaires','mail_settings','notification_settings','profiles','role_permissions','stock_entries','stock_entry_items','stock_exit_items','stock_exits','stock_movements','subcategory_stock_thresholds','user_roles','vehicules')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
  END LOOP;
END $$;