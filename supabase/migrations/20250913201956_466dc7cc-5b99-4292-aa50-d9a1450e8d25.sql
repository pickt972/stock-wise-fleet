-- Création des profils utilisateurs de test
-- Note: Ces utilisateurs devront s'inscrire via l'interface pour avoir des comptes auth complets

-- Générer des UUIDs pour nos utilisateurs de test
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_user_meta_data
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@stockauto.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"first_name": "Admin", "last_name": "Principal"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'alvin@stockauto.com',
    crypt('alvin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"first_name": "Alvin", "last_name": "Dupont"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'julie@stockauto.com',
    crypt('julie123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"first_name": "Julie", "last_name": "Martin"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'sherman@stockauto.com',
    crypt('sherman123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"first_name": "Sherman", "last_name": "Leblanc"}'::jsonb
  );

-- Créer les profils correspondants
INSERT INTO public.profiles (id, first_name, last_name, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'Principal', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'Alvin', 'Dupont', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'Julie', 'Martin', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'Sherman', 'Leblanc', now(), now());

-- Assigner les rôles
INSERT INTO public.user_roles (user_id, role, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', now()),
  ('00000000-0000-0000-0000-000000000002', 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000003', 'magasinier', now()),
  ('00000000-0000-0000-0000-000000000004', 'magasinier', now());