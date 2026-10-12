ALTER TABLE public.commande_items ADD COLUMN IF NOT EXISTS code_barre text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='articles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;
  END IF;
END $$;