-- Ajouter une colonne username à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE;

-- Créer les 4 utilisateurs prédéfinis
-- L'admin
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@stock-wise.local',
  crypt('administrateur', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Rychar", "last_name": "Admin"}',
  'authenticated',
  'authenticated'
);

-- Les 3 magasiniers
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'alvin@stock-wise.local',
  crypt('alvin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Alvin", "last_name": "Magasinier"}',
  'authenticated',
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'julie@stock-wise.local',
  crypt('julie123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Julie", "last_name": "Magasinier"}',
  'authenticated',
  'authenticated'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'sherman@stock-wise.local',
  crypt('sherman123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Sherman", "last_name": "Magasinier"}',
  'authenticated',
  'authenticated'
);

-- Mettre à jour les profils avec les noms d'utilisateur
UPDATE public.profiles 
SET username = 'admin' 
WHERE first_name = 'Rychar' AND last_name = 'Admin';

UPDATE public.profiles 
SET username = 'alvin' 
WHERE first_name = 'Alvin' AND last_name = 'Magasinier';

UPDATE public.profiles 
SET username = 'julie' 
WHERE first_name = 'Julie' AND last_name = 'Magasinier';

UPDATE public.profiles 
SET username = 'sherman' 
WHERE first_name = 'Sherman' AND last_name = 'Magasinier';

-- Mettre à jour les rôles
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM public.profiles WHERE username = 'admin');