-- ============================================
-- SYSTÈME DE JOURNAL D'AUDIT
-- ============================================

-- Table pour les logs d'audit
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fonction pour logger les actions
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Triggers pour auditer automatiquement les actions critiques

-- Audit des articles
CREATE OR REPLACE FUNCTION public.audit_articles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'articles', OLD.id, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('UPDATE', 'articles', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'articles', NEW.id, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_articles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.audit_articles();

-- Audit des commandes
CREATE OR REPLACE FUNCTION public.audit_commandes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'commandes', OLD.id, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('UPDATE', 'commandes', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'commandes', NEW.id, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_commandes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.commandes
FOR EACH ROW EXECUTE FUNCTION public.audit_commandes();

-- Audit des mouvements de stock
CREATE OR REPLACE FUNCTION public.audit_stock_movements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'stock_movements', OLD.id, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'stock_movements', NEW.id, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER audit_stock_movements_trigger
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.audit_stock_movements();

-- Audit des inventaires
CREATE OR REPLACE FUNCTION public.audit_inventaires()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_audit('UPDATE_STATUS', 'inventaires', NEW.id, 
      jsonb_build_object('status', OLD.status), 
      jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_inventaires_trigger
AFTER UPDATE ON public.inventaires
FOR EACH ROW EXECUTE FUNCTION public.audit_inventaires();