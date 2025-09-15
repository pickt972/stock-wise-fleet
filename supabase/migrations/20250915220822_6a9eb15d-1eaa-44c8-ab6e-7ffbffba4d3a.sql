-- Ajouter une colonne vehicule_id à la table stock_movements
ALTER TABLE public.stock_movements 
ADD COLUMN vehicule_id uuid REFERENCES public.vehicules(id);