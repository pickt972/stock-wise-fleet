-- Ajout colonne archived_at sur articles pour soft-archive
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index pour filtrer rapidement les articles actifs
CREATE INDEX IF NOT EXISTS idx_articles_archived ON public.articles (archived_at)
  WHERE archived_at IS NULL;

-- Nettoyer les articles marqués [ARCHIVÉ] dans la désignation (legacy)
UPDATE public.articles
SET
  archived_at = NOW(),
  designation = REGEXP_REPLACE(designation, '^\[ARCHIVÉ\]\s*', '')
WHERE designation LIKE '[ARCHIVÉ]%'
  AND archived_at IS NULL;
