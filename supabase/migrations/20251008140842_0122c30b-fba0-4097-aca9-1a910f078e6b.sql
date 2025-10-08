-- Créer le bucket pour les logos d'entreprise
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Politique pour permettre aux utilisateurs de voir tous les logos
CREATE POLICY "Les logos d'entreprise sont publics"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Politique pour permettre aux utilisateurs d'uploader leur propre logo
CREATE POLICY "Les utilisateurs peuvent uploader leur logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre aux utilisateurs de mettre à jour leur logo
CREATE POLICY "Les utilisateurs peuvent mettre à jour leur logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre aux utilisateurs de supprimer leur logo
CREATE POLICY "Les utilisateurs peuvent supprimer leur logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);