-- Supprimer la contrainte d'unicité sur la référence des articles
-- pour permettre le même article dans plusieurs emplacements
DROP INDEX IF EXISTS articles_reference_key;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_reference_key;