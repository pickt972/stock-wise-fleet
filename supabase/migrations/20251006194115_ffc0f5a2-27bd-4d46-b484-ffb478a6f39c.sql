-- Supprimer les politiques RLS en double qui causent la récursion infinie
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users and admins" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for admins only" ON public.profiles;
DROP POLICY IF EXISTS "Insertion automatique via trigger" ON public.profiles;

-- Les politiques correctes utilisant has_role() restent en place :
-- "Les admins peuvent voir tous les profils"
-- "Les utilisateurs peuvent voir leur propre profil"
-- "Les admins peuvent modifier tous les profils"
-- "Les utilisateurs peuvent modifier leur propre profil"