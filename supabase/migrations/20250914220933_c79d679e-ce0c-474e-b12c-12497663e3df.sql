-- Création de la table fournisseurs
CREATE TABLE public.fournisseurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  contact_principal TEXT,
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

-- Policies pour fournisseurs
CREATE POLICY "Les utilisateurs peuvent voir tous les fournisseurs" 
ON public.fournisseurs 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des fournisseurs" 
ON public.fournisseurs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent modifier les fournisseurs" 
ON public.fournisseurs 
FOR UPDATE 
USING (true);

CREATE POLICY "Les admins peuvent supprimer les fournisseurs" 
ON public.fournisseurs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ajout du champ fournisseur_id à la table articles
ALTER TABLE public.articles 
ADD COLUMN fournisseur_id UUID REFERENCES public.fournisseurs(id);

-- Trigger pour updated_at sur fournisseurs
CREATE TRIGGER update_fournisseurs_updated_at
BEFORE UPDATE ON public.fournisseurs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_articles_fournisseur_id ON public.articles(fournisseur_id);
CREATE INDEX idx_fournisseurs_actif ON public.fournisseurs(actif);

-- Insertion de quelques fournisseurs d'exemple
INSERT INTO public.fournisseurs (nom, email, telephone, adresse, contact_principal) VALUES
('AutoParts Pro', 'commandes@autoparts-pro.fr', '01 23 45 67 89', '123 Rue de l''Industrie, 75011 Paris', 'Jean Dupont'),
('Pièces Express', 'orders@pieces-express.com', '04 56 78 90 12', '45 Avenue des Garages, 69000 Lyon', 'Marie Martin'),
('Garage Supply', 'contact@garage-supply.fr', '02 34 56 78 90', '67 Boulevard de la Réparation, 44000 Nantes', 'Pierre Moreau');