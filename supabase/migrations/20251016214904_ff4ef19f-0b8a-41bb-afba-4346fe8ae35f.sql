-- Supprimer les anciennes politiques de modification pour les articles
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les articles qu'ils ont créés" ON public.articles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les articles qu'ils ont créés" ON public.articles;

-- Nouvelle politique: seuls admins et chefs d'agence peuvent modifier
CREATE POLICY "Admins et chefs agence peuvent modifier articles"
ON public.articles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'chef_agence'::app_role)
);

-- Nouvelle politique: seuls admins et chefs d'agence peuvent supprimer
CREATE POLICY "Admins et chefs agence peuvent supprimer articles"
ON public.articles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'chef_agence'::app_role)
);