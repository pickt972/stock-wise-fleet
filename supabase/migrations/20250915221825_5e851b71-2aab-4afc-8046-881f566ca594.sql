-- Ajouter le champ fournisseur_id à la table stock_movements
ALTER TABLE public.stock_movements 
ADD COLUMN fournisseur_id UUID REFERENCES public.fournisseurs(id);