-- Ensure audit triggers are attached so audit_logs gets populated
-- Drop existing triggers if they exist, then recreate them

-- Articles audit trigger
DROP TRIGGER IF EXISTS trg_audit_articles ON public.articles;
CREATE TRIGGER trg_audit_articles
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.audit_articles();

-- Commandes audit trigger
DROP TRIGGER IF EXISTS trg_audit_commandes ON public.commandes;
CREATE TRIGGER trg_audit_commandes
AFTER INSERT OR UPDATE OR DELETE ON public.commandes
FOR EACH ROW EXECUTE FUNCTION public.audit_commandes();

-- Stock movements audit trigger (function handles INSERT and DELETE)
DROP TRIGGER IF EXISTS trg_audit_stock_movements ON public.stock_movements;
CREATE TRIGGER trg_audit_stock_movements
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.audit_stock_movements();

-- Inventaires status change audit trigger
DROP TRIGGER IF EXISTS trg_audit_inventaires ON public.inventaires;
CREATE TRIGGER trg_audit_inventaires
AFTER UPDATE ON public.inventaires
FOR EACH ROW EXECUTE FUNCTION public.audit_inventaires();

-- Optional indexes to speed up history filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON public.audit_logs (table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);
