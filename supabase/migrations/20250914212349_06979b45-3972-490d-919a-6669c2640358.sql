-- Créer le type enum pour le statut des bons de commande
CREATE TYPE commande_status AS ENUM ('brouillon', 'envoye', 'confirme', 'recu_partiel', 'recu_complet', 'annule');

-- Table pour les bons de commande
CREATE TABLE public.commandes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_commande TEXT NOT NULL UNIQUE,
  fournisseur TEXT NOT NULL,
  email_fournisseur TEXT,
  telephone_fournisseur TEXT,
  adresse_fournisseur TEXT,
  status commande_status NOT NULL DEFAULT 'brouillon',
  total_ht DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_ttc DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tva_taux DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_envoi TIMESTAMP WITH TIME ZONE,
  date_reception_prevue DATE,
  date_reception_reelle TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les articles des bons de commande
CREATE TABLE public.commande_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id UUID NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  designation TEXT NOT NULL,
  reference TEXT,
  quantite_commandee INTEGER NOT NULL,
  quantite_recue INTEGER NOT NULL DEFAULT 0,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  total_ligne DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer les index pour optimiser les performances
CREATE INDEX idx_commandes_user_id ON public.commandes(user_id);
CREATE INDEX idx_commandes_status ON public.commandes(status);
CREATE INDEX idx_commandes_numero ON public.commandes(numero_commande);
CREATE INDEX idx_commande_items_commande_id ON public.commande_items(commande_id);
CREATE INDEX idx_commande_items_article_id ON public.commande_items(article_id);

-- Activer RLS sur les tables
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les commandes
CREATE POLICY "Les utilisateurs peuvent voir toutes les commandes" 
ON public.commandes 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des commandes" 
ON public.commandes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les commandes qu'ils ont créées" 
ON public.commandes 
FOR UPDATE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Les utilisateurs peuvent supprimer les commandes qu'ils ont créées" 
ON public.commandes 
FOR DELETE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Politiques RLS pour les articles de commande
CREATE POLICY "Les utilisateurs peuvent voir tous les articles de commande" 
ON public.commande_items 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des articles de commande pour leurs commandes" 
ON public.commande_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.commandes 
  WHERE id = commande_id AND user_id = auth.uid()
));

CREATE POLICY "Les utilisateurs peuvent modifier les articles de leurs commandes" 
ON public.commande_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.commandes 
  WHERE id = commande_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Les utilisateurs peuvent supprimer les articles de leurs commandes" 
ON public.commande_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.commandes 
  WHERE id = commande_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_commandes_updated_at
BEFORE UPDATE ON public.commandes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commande_items_updated_at
BEFORE UPDATE ON public.commande_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer un numéro de commande automatique
CREATE OR REPLACE FUNCTION public.generate_commande_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_commande IS NULL OR NEW.numero_commande = '' THEN
    NEW.numero_commande := 'CMD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('commande_sequence')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la séquence pour les numéros de commande
CREATE SEQUENCE IF NOT EXISTS commande_sequence START 1;

-- Trigger pour générer automatiquement le numéro de commande
CREATE TRIGGER generate_commande_numero_trigger
BEFORE INSERT ON public.commandes
FOR EACH ROW
EXECUTE FUNCTION public.generate_commande_numero();

-- Fonction pour calculer les totaux d'une commande
CREATE OR REPLACE FUNCTION public.update_commande_totals(commande_id_param UUID)
RETURNS VOID AS $$
DECLARE
  total_ht_calc DECIMAL(10,2);
  total_ttc_calc DECIMAL(10,2);
  tva_rate DECIMAL(5,2);
BEGIN
  -- Récupérer le taux de TVA de la commande
  SELECT tva_taux INTO tva_rate FROM public.commandes WHERE id = commande_id_param;
  
  -- Calculer le total HT
  SELECT COALESCE(SUM(total_ligne), 0) INTO total_ht_calc
  FROM public.commande_items 
  WHERE commande_id = commande_id_param;
  
  -- Calculer le total TTC
  total_ttc_calc := total_ht_calc * (1 + tva_rate / 100);
  
  -- Mettre à jour la commande
  UPDATE public.commandes 
  SET total_ht = total_ht_calc, 
      total_ttc = total_ttc_calc,
      updated_at = now()
  WHERE id = commande_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour recalculer les totaux automatiquement
CREATE OR REPLACE FUNCTION public.trigger_update_commande_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_commande_totals(OLD.commande_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_commande_totals(NEW.commande_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commande_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.commande_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_commande_totals();