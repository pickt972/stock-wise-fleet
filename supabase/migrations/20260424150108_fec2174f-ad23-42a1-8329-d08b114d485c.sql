ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS sous_categorie text;
CREATE INDEX IF NOT EXISTS idx_articles_sous_categorie ON public.articles(sous_categorie);