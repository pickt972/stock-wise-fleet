-- Create helper to get auth.user id by email (avoids Admin listUsers pagination issues)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
$$;

-- Ensure function is executable by authenticated users (edge functions use service role anyway)
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO authenticated, anon, service_role;
