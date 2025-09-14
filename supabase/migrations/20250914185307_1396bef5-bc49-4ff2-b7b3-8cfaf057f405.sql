-- Création de la table pour les mouvements de stock
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  motif TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer Row Level Security
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les mouvements de stock
CREATE POLICY "Les utilisateurs peuvent voir tous les mouvements" 
ON public.stock_movements 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des mouvements" 
ON public.stock_movements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent modifier tous les mouvements" 
ON public.stock_movements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_stock_movements_updated_at
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour mettre à jour le stock d'un article
CREATE OR REPLACE FUNCTION public.update_article_stock(
  article_id UUID,
  quantity_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.articles 
  SET stock = stock + quantity_change,
      updated_at = now()
  WHERE id = article_id;
  
  -- Vérifier que le stock ne devient pas négatif
  IF (SELECT stock FROM public.articles WHERE id = article_id) < 0 THEN
    RAISE EXCEPTION 'Le stock ne peut pas être négatif';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;