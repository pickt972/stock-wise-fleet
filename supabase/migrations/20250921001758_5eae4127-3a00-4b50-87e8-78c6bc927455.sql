-- Créer la table des emplacements
CREATE TABLE public.emplacements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.emplacements ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir tous les emplacements actifs" 
ON public.emplacements 
FOR SELECT 
USING (actif = true);

CREATE POLICY "Les utilisateurs peuvent créer des emplacements" 
ON public.emplacements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les emplacements qu'ils ont créés" 
ON public.emplacements 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les admins peuvent tout faire sur les emplacements" 
ON public.emplacements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer le trigger pour updated_at
CREATE TRIGGER update_emplacements_updated_at
BEFORE UPDATE ON public.emplacements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les emplacements existants depuis la table articles
INSERT INTO public.emplacements (nom, actif, user_id)
SELECT DISTINCT emplacement, true, NULL
FROM public.articles 
WHERE emplacement IS NOT NULL 
  AND emplacement != ''
  AND emplacement NOT IN (SELECT nom FROM public.emplacements)
ON CONFLICT (nom) DO NOTHING;

-- Ajouter une clé étrangère vers la table emplacements (optionnel pour la compatibilité)
ALTER TABLE public.articles 
ADD COLUMN emplacement_id UUID REFERENCES public.emplacements(id);