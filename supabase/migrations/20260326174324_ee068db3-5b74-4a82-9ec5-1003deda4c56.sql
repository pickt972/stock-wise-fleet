
-- Drop the remaining overly permissive inventaire_items policies
-- (previous DROP failed due to apostrophe escaping)
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des items d'inventaire" ON public.inventaire_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les items d'inventaire" ON public.inventaire_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les items d'inventaire" ON public.inventaire_items;
