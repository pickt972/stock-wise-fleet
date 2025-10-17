-- Permettre à tous les utilisateurs authentifiés de modifier les articles
-- Cette policy est nécessaire pour les transferts d'emplacements
CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les articles"
ON public.articles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);