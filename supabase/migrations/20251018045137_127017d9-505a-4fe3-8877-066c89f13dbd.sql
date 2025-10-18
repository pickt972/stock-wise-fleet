-- Mettre à jour la policy RLS pour la table articles
-- Seuls les admins peuvent modifier le champ stock directement

-- Supprimer les anciennes policies qui permettent de modifier articles
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent modifier les articles" ON public.articles;

-- Créer une nouvelle policy qui permet aux admins de tout modifier
CREATE POLICY "Les admins peuvent tout modifier sur articles"
ON public.articles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Créer une policy qui permet aux chef_agence de modifier SAUF le stock
CREATE POLICY "Les chefs agence peuvent modifier articles sauf stock"
ON public.articles
FOR UPDATE
USING (
  has_role(auth.uid(), 'chef_agence'::app_role)
  AND (
    SELECT stock FROM public.articles WHERE id = articles.id
  ) = stock  -- Le stock ne doit pas changer
)
WITH CHECK (
  has_role(auth.uid(), 'chef_agence'::app_role)
  AND (
    SELECT stock FROM public.articles WHERE id = articles.id
  ) = stock  -- Le stock ne doit pas changer
);

-- Note: Les mouvements de stock continuent de fonctionner via la fonction update_article_stock
-- qui utilise SECURITY DEFINER pour bypasser RLS