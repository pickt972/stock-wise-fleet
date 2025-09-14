-- Créer la table de liaison article-fournisseurs
CREATE TABLE public.article_fournisseurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id) ON DELETE CASCADE,
  prix_fournisseur NUMERIC(10,2),
  reference_fournisseur TEXT,
  delai_livraison INTEGER, -- délai en jours
  quantite_minimum INTEGER DEFAULT 1,
  est_principal BOOLEAN DEFAULT false,
  actif BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  UNIQUE(article_id, fournisseur_id)
);

-- Activer RLS
ALTER TABLE public.article_fournisseurs ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir toutes les associations article-fournisseur"
ON public.article_fournisseurs 
FOR SELECT 
USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des associations article-fournisseur"
ON public.article_fournisseurs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier les associations qu'ils ont créées"
ON public.article_fournisseurs 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer les associations qu'ils ont créées"
ON public.article_fournisseurs 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = user_id);

CREATE POLICY "Les admins peuvent tout faire sur les associations article-fournisseur"
ON public.article_fournisseurs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer un trigger pour mettre à jour updated_at
CREATE TRIGGER update_article_fournisseurs_updated_at
BEFORE UPDATE ON public.article_fournisseurs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour s'assurer qu'il n'y a qu'un seul fournisseur principal par article
CREATE OR REPLACE FUNCTION public.ensure_single_principal_fournisseur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.est_principal = true THEN
    -- Désactiver le statut principal pour les autres fournisseurs de cet article
    UPDATE public.article_fournisseurs 
    SET est_principal = false 
    WHERE article_id = NEW.article_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger pour la fonction
CREATE TRIGGER ensure_single_principal_fournisseur_trigger
BEFORE INSERT OR UPDATE ON public.article_fournisseurs
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_principal_fournisseur();