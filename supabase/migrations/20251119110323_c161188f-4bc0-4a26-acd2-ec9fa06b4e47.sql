-- Créer la table des entrées de stock principales
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('achat', 'retour', 'transfert', 'ajustement', 'reparation', 'autre')),
  supplier_id UUID REFERENCES public.fournisseurs(id),
  invoice_number TEXT,
  location TEXT,
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

-- Créer la table des détails d'entrée (articles)
CREATE TABLE IF NOT EXISTS public.stock_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.stock_entries(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_stock_entries_created_by ON public.stock_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_entries_status ON public.stock_entries(status);
CREATE INDEX IF NOT EXISTS idx_stock_entries_date ON public.stock_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_entry ON public.stock_entry_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_article ON public.stock_entry_items(article_id);

-- RLS policies pour stock_entries
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs authentifiés peuvent voir les entrées"
ON public.stock_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des entrées"
ON public.stock_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Les admins peuvent modifier les entrées récentes"
ON public.stock_entries FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND created_at > NOW() - INTERVAL '7 days'
);

-- RLS policies pour stock_entry_items
ALTER TABLE public.stock_entry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs authentifiés peuvent voir les items"
ON public.stock_entry_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des items"
ON public.stock_entry_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stock_entries
    WHERE id = entry_id AND created_by = auth.uid()
  )
);

-- Fonction pour générer le numéro d'entrée
CREATE OR REPLACE FUNCTION public.generate_entry_number()
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
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_seq
  FROM public.stock_entries
  WHERE entry_number LIKE 'ENT-' || year_part || '-%';
  
  RETURN 'ENT-' || year_part || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$;

-- Trigger pour auto-générer le numéro d'entrée
CREATE OR REPLACE FUNCTION public.set_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := public.generate_entry_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_entry_number
BEFORE INSERT ON public.stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_entry_number();

-- Trigger pour mettre à jour le stock après insertion d'items
CREATE OR REPLACE FUNCTION public.update_stock_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_creator UUID;
BEGIN
  -- Récupérer le créateur de l'entrée
  SELECT created_by INTO entry_creator
  FROM public.stock_entries
  WHERE id = NEW.entry_id;
  
  -- Augmenter le stock de l'article
  UPDATE public.articles
  SET stock = stock + NEW.quantity,
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
    'entree',
    'Entrée de stock',
    NEW.quantity,
    entry_creator,
    entry_creator,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock_on_entry
AFTER INSERT ON public.stock_entry_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_entry();

-- Trigger pour réversion du stock en cas de suppression (soft delete)
CREATE OR REPLACE FUNCTION public.revert_stock_on_delete_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  current_stock INTEGER;
BEGIN
  -- Vérifier qu'on passe bien de active à deleted
  IF OLD.status = 'active' AND NEW.status = 'deleted' THEN
    -- Pour chaque article de l'entrée
    FOR item IN 
      SELECT article_id, quantity 
      FROM public.stock_entry_items 
      WHERE entry_id = NEW.id
    LOOP
      -- Vérifier le stock actuel
      SELECT stock INTO current_stock 
      FROM public.articles 
      WHERE id = item.article_id;
      
      -- Si le stock serait négatif, annuler
      IF current_stock < item.quantity THEN
        RAISE EXCEPTION 'Stock insuffisant pour cet article (actuel: %, à retirer: %)', current_stock, item.quantity;
      END IF;
      
      -- Diminuer le stock
      UPDATE public.articles
      SET stock = stock - item.quantity,
          updated_at = NOW()
      WHERE id = item.article_id;
      
      -- Créer un mouvement négatif
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
        'sortie',
        'Suppression entrée: ' || COALESCE(NEW.deleted_reason, 'Non spécifié'),
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

CREATE TRIGGER trigger_revert_stock_on_delete
AFTER UPDATE OF status ON public.stock_entries
FOR EACH ROW
EXECUTE FUNCTION public.revert_stock_on_delete_entry();

-- Trigger pour mettre à jour le total de l'entrée
CREATE OR REPLACE FUNCTION public.update_entry_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stock_entries
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM public.stock_entry_items
    WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
  )
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_entry_total_on_insert
AFTER INSERT ON public.stock_entry_items
FOR EACH ROW
EXECUTE FUNCTION public.update_entry_total();

CREATE TRIGGER trigger_update_entry_total_on_delete
AFTER DELETE ON public.stock_entry_items
FOR EACH ROW
EXECUTE FUNCTION public.update_entry_total();