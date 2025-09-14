-- Création de la table articles pour la gestion des stocks
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  marque TEXT NOT NULL,
  categorie TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 0,
  stock_max INTEGER NOT NULL DEFAULT 100,
  prix_achat DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  emplacement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Activer Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les articles
CREATE POLICY "Les utilisateurs peuvent voir tous les articles" 
ON public.articles 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des articles" 
ON public.articles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les articles qu'ils ont créés" 
ON public.articles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer les articles qu'ils ont créés" 
ON public.articles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Les admins peuvent tout faire
CREATE POLICY "Les admins peuvent modifier tous les articles" 
ON public.articles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer quelques données de test
INSERT INTO public.articles (reference, designation, marque, categorie, stock, stock_min, stock_max, prix_achat, emplacement) 
VALUES 
  ('HM-530', 'Huile moteur 5W30', 'Castrol', 'Consommables', 0, 5, 50, 8.50, 'A1-B2'),
  ('PF-001', 'Plaquettes frein avant', 'Brembo', 'Freinage', 2, 3, 20, 45.00, 'B2-C1'),
  ('AF-001', 'Filtre à air', 'Mann', 'Filtration', 15, 5, 30, 12.30, 'C1-D2'),
  ('BAT-12V', 'Batterie 12V 60Ah', 'Varta', 'Électrique', 3, 2, 15, 89.90, 'D2-E1');