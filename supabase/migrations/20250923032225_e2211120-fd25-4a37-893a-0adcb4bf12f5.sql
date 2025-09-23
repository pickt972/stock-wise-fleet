-- Créer une table pour les sessions d'inventaire
CREATE TABLE public.inventaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_inventaire DATE NOT NULL,
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_cloture TIMESTAMP WITH TIME ZONE NULL,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'cloture', 'valide')),
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date_inventaire) -- Un seul inventaire par jour
);

-- Créer une table pour les articles inventoriés
CREATE TABLE public.inventaire_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventaire_id UUID NOT NULL REFERENCES public.inventaires(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  stock_theorique INTEGER NOT NULL DEFAULT 0,
  stock_compte INTEGER NULL,
  ecart INTEGER NULL,
  emplacement_id UUID NULL REFERENCES public.emplacements(id),
  emplacement TEXT NULL,
  counted_by UUID NULL,
  date_comptage TIMESTAMP WITH TIME ZONE NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventaire_id, article_id, emplacement_id) -- Un seul comptage par article/emplacement par inventaire
);

-- Activer RLS sur les tables
ALTER TABLE public.inventaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventaire_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les inventaires
CREATE POLICY "Les utilisateurs peuvent voir tous les inventaires" 
ON public.inventaires 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des inventaires" 
ON public.inventaires 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Le créateur et les admins peuvent modifier les inventaires" 
ON public.inventaires 
FOR UPDATE 
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les admins peuvent supprimer les inventaires" 
ON public.inventaires 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Politiques RLS pour les items d'inventaire
CREATE POLICY "Les utilisateurs peuvent voir tous les items d'inventaire" 
ON public.inventaire_items 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des items d'inventaire" 
ON public.inventaire_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Les utilisateurs peuvent modifier les items d'inventaire" 
ON public.inventaire_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Les utilisateurs peuvent supprimer les items d'inventaire" 
ON public.inventaire_items 
FOR DELETE 
USING (true);

-- Fonction pour calculer automatiquement l'écart
CREATE OR REPLACE FUNCTION public.calculate_inventory_variance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_compte IS NOT NULL THEN
    NEW.ecart = NEW.stock_compte - NEW.stock_theorique;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer l'écart automatiquement
CREATE TRIGGER trigger_calculate_inventory_variance
  BEFORE INSERT OR UPDATE ON public.inventaire_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_inventory_variance();

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_inventaires_updated_at
  BEFORE UPDATE ON public.inventaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventaire_items_updated_at
  BEFORE UPDATE ON public.inventaire_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();