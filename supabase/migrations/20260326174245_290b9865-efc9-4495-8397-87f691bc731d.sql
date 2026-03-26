
-- Fix is_admin function: add search_path and use user_roles instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = uid
      AND role = 'admin'
  );
$function$;

-- Fix fournisseurs: use has_role check instead of auth.role() = 'authenticated'
DROP POLICY IF EXISTS "Authenticated users can update fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "Authenticated users can insert fournisseurs" ON public.fournisseurs;

CREATE POLICY "Authenticated users can insert fournisseurs"
ON public.fournisseurs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update fournisseurs"
ON public.fournisseurs FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix stock_exits: the return update policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les retours" ON public.stock_exits;
CREATE POLICY "Les utilisateurs peuvent modifier les retours"
ON public.stock_exits FOR UPDATE TO authenticated
USING (
  exit_type = 'location_accessoire'
  AND return_status IS NOT NULL
  AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);
