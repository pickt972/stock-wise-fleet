-- Ajouter la colonne code_barre à la table articles
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS code_barre TEXT;

-- Créer un index pour améliorer les performances de recherche par code-barres
CREATE INDEX IF NOT EXISTS idx_articles_code_barre ON public.articles(code_barre);