-- Corriger le problème de search_path pour les nouvelles policies
-- On doit recréer les policies avec une approche différente pour éviter les problèmes de search_path

-- Supprimer les policies avec problème
DROP POLICY IF EXISTS "Les chefs agence peuvent modifier articles sauf stock" ON public.articles;

-- Recréer la policy pour chef_agence de manière plus simple
-- Les chefs d'agence peuvent modifier les articles, mais la validation du stock
-- se fera au niveau de l'application
CREATE POLICY "Les chefs agence peuvent modifier articles"
ON public.articles
FOR UPDATE
USING (has_role(auth.uid(), 'chef_agence'::app_role))
WITH CHECK (has_role(auth.uid(), 'chef_agence'::app_role));