DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'articles',
    'stock_entries',
    'stock_entry_items',
    'stock_exits',
    'stock_exit_items',
    'stock_movements',
    'accessoire_transferts',
    'commandes',
    'commande_items',
    'notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;