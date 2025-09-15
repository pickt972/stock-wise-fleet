-- Créer la table vehicules
CREATE TABLE public.vehicules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  motorisation TEXT,
  immatriculation TEXT NOT NULL UNIQUE,
  annee INTEGER,
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users
);

-- Créer la table de liaison article_vehicules pour la compatibilité
CREATE TABLE public.article_vehicules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  vehicule_id UUID NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users,
  UNIQUE(article_id, vehicule_id)
);

-- Enable RLS sur les tables
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_vehicules ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour vehicules
CREATE POLICY "Les utilisateurs peuvent voir tous les véhicules" 
  ON public.vehicules FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des véhicules" 
  ON public.vehicules FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les véhicules qu'ils ont créés" 
  ON public.vehicules FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer les véhicules qu'ils ont créés" 
  ON public.vehicules FOR DELETE USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les admins peuvent tout faire sur les véhicules" 
  ON public.vehicules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Politiques RLS pour article_vehicules
CREATE POLICY "Les utilisateurs peuvent voir toutes les compatibilités" 
  ON public.article_vehicules FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des compatibilités" 
  ON public.article_vehicules FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les compatibilités qu'ils ont créées" 
  ON public.article_vehicules FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer les compatibilités qu'ils ont créées" 
  ON public.article_vehicules FOR DELETE USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les admins peuvent tout faire sur les compatibilités" 
  ON public.article_vehicules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_vehicules_updated_at
  BEFORE UPDATE ON public.vehicules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_article_vehicules_updated_at
  BEFORE UPDATE ON public.article_vehicules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();