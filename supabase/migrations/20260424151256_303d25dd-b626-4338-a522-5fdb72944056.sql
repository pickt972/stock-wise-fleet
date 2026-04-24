-- Table de seuils min agrégés par sous-catégorie et véhicule compatible
CREATE TABLE IF NOT EXISTS public.subcategory_stock_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sous_categorie text NOT NULL,
  vehicule_id uuid NULL,
  stock_min integer NOT NULL DEFAULT 0,
  created_by uuid NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subcat_threshold_unique UNIQUE (sous_categorie, vehicule_id)
);

CREATE INDEX IF NOT EXISTS idx_subcat_thresholds_subcat ON public.subcategory_stock_thresholds(sous_categorie);
CREATE INDEX IF NOT EXISTS idx_subcat_thresholds_vehicule ON public.subcategory_stock_thresholds(vehicule_id);

ALTER TABLE public.subcategory_stock_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view thresholds"
  ON public.subcategory_stock_thresholds FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin or chef_agence can insert thresholds"
  ON public.subcategory_stock_thresholds FOR INSERT
  TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'chef_agence'::app_role)
  );

CREATE POLICY "Admin or chef_agence can update thresholds"
  ON public.subcategory_stock_thresholds FOR UPDATE
  TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'chef_agence'::app_role)
  );

CREATE POLICY "Admin can delete thresholds"
  ON public.subcategory_stock_thresholds FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_subcat_thresholds_updated_at
  BEFORE UPDATE ON public.subcategory_stock_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();