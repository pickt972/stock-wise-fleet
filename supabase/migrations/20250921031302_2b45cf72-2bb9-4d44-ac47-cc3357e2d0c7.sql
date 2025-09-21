-- Modifier la politique RLS pour permettre aux admins de créer d'autres utilisateurs avec n'importe quel rôle
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les rôles" ON public.user_roles;

-- Nouvelle politique qui permet aux admins de créer, modifier et supprimer tous les rôles
CREATE POLICY "Les admins peuvent tout faire sur les rôles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));