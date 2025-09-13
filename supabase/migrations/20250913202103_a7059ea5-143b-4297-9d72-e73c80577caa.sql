-- Créer les profils utilisateurs avec conversion de type correcte
INSERT INTO public.profiles (id, first_name, last_name, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Admin', 'Principal', now(), now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Alvin', 'Dupont', now(), now()),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Julie', 'Martin', now(), now()),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'Sherman', 'Leblanc', now(), now())
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();

-- Créer les rôles utilisateurs
INSERT INTO public.user_roles (user_id, role, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin', now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'magasinier', now())
ON CONFLICT (user_id, role) DO NOTHING;