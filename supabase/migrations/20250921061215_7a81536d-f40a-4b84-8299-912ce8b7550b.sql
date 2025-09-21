-- Supprimer la contrainte d'unicité sur la référence des articles
-- pour permettre le même article dans plusieurs emplacements
ALTER TABLE articles DROP CONSTRAINT articles_reference_key;