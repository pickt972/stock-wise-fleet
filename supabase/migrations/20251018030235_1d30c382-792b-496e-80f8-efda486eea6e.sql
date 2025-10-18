-- Recreate audit triggers and add helpful indexes
-- Safe drops (idempotent)
DROP TRIGGER IF EXISTS trg_audit_articles ON public.articles;
DROP TRIGGER IF EXISTS trg_audit_commandes ON public.commandes;
DROP TRIGGER IF EXISTS trg_audit_stock_movements ON public.stock_movements;
DROP TRIGGER IF EXISTS trg_audit_inventaires ON public.inventaires;

-- Create triggers for audit logging
CREATE TRIGGER trg_audit_articles
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.audit_articles();

CREATE TRIGGER trg_audit_commandes
AFTER INSERT OR UPDATE OR DELETE ON public.commandes
FOR EACH ROW EXECUTE FUNCTION public.audit_commandes();

-- The audit_stock_movements() function handles INSERT and DELETE
CREATE TRIGGER trg_audit_stock_movements
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.audit_stock_movements();

-- Status changes on inventaires
CREATE TRIGGER trg_audit_inventaires
AFTER UPDATE ON public.inventaires
FOR EACH ROW EXECUTE FUNCTION public.audit_inventaires();

-- Performance indexes for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);