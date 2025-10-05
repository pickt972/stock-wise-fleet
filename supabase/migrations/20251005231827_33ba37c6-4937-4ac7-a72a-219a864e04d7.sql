-- Fix security issue: Restrict fournisseurs table access to authenticated users only
-- Current policy allows public read access (true), which exposes sensitive supplier data

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir tous les fournisseurs" ON public.fournisseurs;

-- Create new policy that requires authentication
CREATE POLICY "Les utilisateurs authentifiés peuvent voir tous les fournisseurs"
ON public.fournisseurs
FOR SELECT
TO authenticated
USING (true);