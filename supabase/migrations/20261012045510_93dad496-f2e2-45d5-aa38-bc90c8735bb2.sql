ALTER TABLE public.commande_items
  ADD COLUMN IF NOT EXISTS vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categorie text,
  ADD COLUMN IF NOT EXISTS sous_categorie text,
  ADD COLUMN IF NOT EXISTS precision_note text,
  ADD COLUMN IF NOT EXISTS reference_a_confirmer boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_commande_items_vehicule_id ON public.commande_items(vehicule_id);