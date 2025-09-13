-- Ensure trigger exists to create profile & role on new auth users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Fix instance_id for the pre-seeded users to match current instance
DO $$
DECLARE inst uuid;
BEGIN
  SELECT id INTO inst FROM auth.instances LIMIT 1;

  UPDATE auth.users
  SET instance_id = inst
  WHERE email IN (
    'admin@stock-wise.local',
    'alvin@stock-wise.local',
    'julie@stock-wise.local',
    'sherman@stock-wise.local'
  );
END $$;

-- Backfill profiles for pre-seeded users if missing
INSERT INTO public.profiles (id, first_name, last_name, username)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'first_name',''),
       COALESCE(u.raw_user_meta_data->>'last_name',''),
       CASE
         WHEN u.email='admin@stock-wise.local' THEN 'admin'
         WHEN u.email='alvin@stock-wise.local' THEN 'alvin'
         WHEN u.email='julie@stock-wise.local' THEN 'julie'
         WHEN u.email='sherman@stock-wise.local' THEN 'sherman'
       END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'admin@stock-wise.local',
  'alvin@stock-wise.local',
  'julie@stock-wise.local',
  'sherman@stock-wise.local'
) AND p.id IS NULL;

-- Backfill roles if missing (default magasinier)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'magasinier'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email IN (
  'admin@stock-wise.local',
  'alvin@stock-wise.local',
  'julie@stock-wise.local',
  'sherman@stock-wise.local'
) AND r.user_id IS NULL;

-- Promote admin user
UPDATE public.user_roles
SET role = 'admin'::app_role
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@stock-wise.local');