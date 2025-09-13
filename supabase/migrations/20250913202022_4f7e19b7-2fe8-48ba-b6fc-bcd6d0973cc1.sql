-- Vérifier si les profils existent déjà et créer seulement ceux qui manquent
-- Créer les profils manquants
INSERT INTO public.profiles (id, first_name, last_name, created_at, updated_at) 
SELECT * FROM (VALUES
  ('00000000-0000-0000-0000-000000000002', 'Alvin', 'Dupont', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'Julie', 'Martin', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'Sherman', 'Leblanc', now(), now())
) AS new_profiles(id, first_name, last_name, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = new_profiles.id
);

-- Mettre à jour le rôle de l'administrateur existant
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Créer les rôles pour les nouveaux employés
INSERT INTO public.user_roles (user_id, role, created_at) 
SELECT * FROM (VALUES
  ('00000000-0000-0000-0000-000000000002', 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000003', 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000004', 'magasinier', now())
) AS new_roles(user_id, role, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = new_roles.user_id
);