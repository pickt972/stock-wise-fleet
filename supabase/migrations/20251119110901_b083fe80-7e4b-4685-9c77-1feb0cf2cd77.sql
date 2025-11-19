-- Créer la table des sorties de stock principales
CREATE TABLE IF NOT EXISTS public.stock_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_number TEXT UNIQUE NOT NULL,
  exit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  exit_type TEXT NOT NULL CHECK (exit_type IN ('utilisation_vehicule', 'location_accessoire', 'consommation', 'perte_casse', 'autre')),
  vehicule_id UUID REFERENCES public.vehicules(id),
  client_name TEXT,
  client_reference TEXT,
  intervention_type TEXT,
  kilometrage INTEGER,
  caution_amount NUMERIC(10,2),
  expected_return_date DATE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  return_status TEXT CHECK (return_status IN ('en_cours', 'retourne_ok', 'retourne_endommage', 'non_retourne')),
  damage_description TEXT,
  department TEXT,
  reason TEXT,
  responsible_party TEXT CHECK (responsible_party IN ('client', 'employe', 'vol', 'usure', 'autre')),
  reimbursement_amount NUMERIC(10,2),
  notes TEXT,
  total_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  deleted_reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table des détails de sortie (articles)
CREATE TABLE IF NOT EXISTS public.stock_exit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_id UUID REFERENCES public.stock_exits(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_stock_exits_created_by ON public.stock_exits(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_exits_status ON public.stock_exits(status);
CREATE INDEX IF NOT EXISTS idx_stock_exits_date ON public.stock_exits(exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_exits_vehicule ON public.stock_exits(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_return_status ON public.stock_exits(return_status);
CREATE INDEX IF NOT EXISTS idx_stock_exit_items_exit ON public.stock_exit_items(exit_id);
CREATE INDEX IF NOT EXISTS idx_stock_exit_items_article ON public.stock_exit_items(article_id);

-- RLS policies pour stock_exits
ALTER TABLE public.stock_exits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs authentifiés peuvent voir les sorties"
ON public.stock_exits FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des sorties"
ON public.stock_exits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Les admins peuvent modifier les sorties récentes"
ON public.stock_exits FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND created_at > NOW() - INTERVAL '7 days'
);

CREATE POLICY "Les utilisateurs peuvent modifier les retours"
ON public.stock_exits FOR UPDATE
TO authenticated
USING (
  exit_type = 'location_accessoire' 
  AND return_status IS NOT NULL
);

-- RLS policies pour stock_exit_items
ALTER TABLE public.stock_exit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs authentifiés peuvent voir les items"
ON public.stock_exit_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des items"
ON public.stock_exit_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stock_exits
    WHERE id = exit_id AND created_by = auth.uid()
  )
);

-- Fonction pour générer le numéro de sortie
CREATE OR REPLACE FUNCTION public.generate_exit_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(exit_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_seq
  FROM public.stock_exits
  WHERE exit_number LIKE 'SOR-' || year_part || '-%';
  
  RETURN 'SOR-' || year_part || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$;

-- Trigger pour auto-générer le numéro de sortie
CREATE OR REPLACE FUNCTION public.set_exit_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.exit_number IS NULL OR NEW.exit_number = '' THEN
    NEW.exit_number := public.generate_exit_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_exit_number
BEFORE INSERT ON public.stock_exits
FOR EACH ROW
EXECUTE FUNCTION public.set_exit_number();

-- Trigger pour vérifier et diminuer le stock après insertion d'items
CREATE OR REPLACE FUNCTION public.decrease_stock_on_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exit_creator UUID;
  current_stock INTEGER;
  article_designation TEXT;
BEGIN
  -- Récupérer le stock actuel
  SELECT stock, designation INTO current_stock, article_designation
  FROM public.articles
  WHERE id = NEW.article_id;
  
  -- Vérifier stock suffisant
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuffisant pour % (actuel: %, demandé: %)', 
      article_designation, current_stock, NEW.quantity;
  END IF;
  
  -- Récupérer le créateur de la sortie
  SELECT created_by INTO exit_creator
  FROM public.stock_exits
  WHERE id = NEW.exit_id;
  
  -- Diminuer le stock de l'article
  UPDATE public.articles
  SET stock = stock - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.article_id;
  
  -- Créer un mouvement dans l'historique
  INSERT INTO public.stock_movements (
    article_id,
    type,
    motif,
    quantity,
    user_id,
    created_by,
    created_at
  ) VALUES (
    NEW.article_id,
    'sortie',
    'Sortie de stock',
    NEW.quantity,
    exit_creator,
    exit_creator,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_decrease_stock_on_exit
AFTER INSERT ON public.stock_exit_items
FOR EACH ROW
EXECUTE FUNCTION public.decrease_stock_on_exit();

-- Trigger pour restaurer le stock en cas de suppression (soft delete)
CREATE OR REPLACE FUNCTION public.restore_stock_on_delete_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Vérifier qu'on passe bien de active à deleted
  IF OLD.status = 'active' AND NEW.status = 'deleted' THEN
    -- Pour chaque article de la sortie
    FOR item IN 
      SELECT article_id, quantity 
      FROM public.stock_exit_items 
      WHERE exit_id = NEW.id
    LOOP
      -- Augmenter le stock (restauration)
      UPDATE public.articles
      SET stock = stock + item.quantity,
          updated_at = NOW()
      WHERE id = item.article_id;
      
      -- Créer un mouvement positif
      INSERT INTO public.stock_movements (
        article_id,
        type,
        motif,
        quantity,
        user_id,
        created_by,
        created_at
      ) VALUES (
        item.article_id,
        'entree',
        'Annulation sortie: ' || COALESCE(NEW.deleted_reason, 'Non spécifié'),
        item.quantity,
        NEW.deleted_by,
        NEW.deleted_by,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_restore_stock_on_delete
AFTER UPDATE OF status ON public.stock_exits
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_delete_exit();

-- Trigger pour mettre à jour le total de la sortie
CREATE OR REPLACE FUNCTION public.update_exit_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stock_exits
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM public.stock_exit_items
    WHERE exit_id = COALESCE(NEW.exit_id, OLD.exit_id)
  )
  WHERE id = COALESCE(NEW.exit_id, OLD.exit_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_exit_total_on_insert
AFTER INSERT ON public.stock_exit_items
FOR EACH ROW
EXECUTE FUNCTION public.update_exit_total();

CREATE TRIGGER trigger_update_exit_total_on_delete
AFTER DELETE ON public.stock_exit_items
FOR EACH ROW
EXECUTE FUNCTION public.update_exit_total();