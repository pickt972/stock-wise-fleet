-- Créer la table des catégories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir toutes les catégories actives"
ON public.categories 
FOR SELECT 
USING (actif = true);

CREATE POLICY "Les utilisateurs peuvent créer des catégories"
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les catégories qu'ils ont créées"
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les admins peuvent tout faire sur les catégories"
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer un trigger pour mettre à jour updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des catégories par défaut
INSERT INTO public.categories (nom, description) VALUES 
('Électronique', 'Composants électroniques et électriques'),
('Informatique', 'Matériel et accessoires informatiques'),
('Mobilier', 'Mobilier de bureau et équipements'),
('Fournitures', 'Fournitures de bureau et consommables'),
('Équipement', 'Équipements et outils professionnels'),
('Consommables', 'Produits consommables et de maintenance');