-- Vérifier et créer les triggers manquants pour l'audit des articles

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS audit_articles_trigger ON public.articles;
DROP TRIGGER IF EXISTS audit_commandes_trigger ON public.commandes;
DROP TRIGGER IF EXISTS audit_stock_movements_trigger ON public.stock_movements;
DROP TRIGGER IF EXISTS audit_inventaires_trigger ON public.inventaires;

-- Créer le trigger pour les articles
CREATE TRIGGER audit_articles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_articles();

-- Créer le trigger pour les commandes
CREATE TRIGGER audit_commandes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.commandes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_commandes();

-- Créer le trigger pour les mouvements de stock
CREATE TRIGGER audit_stock_movements_trigger
  AFTER INSERT OR DELETE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_stock_movements();

-- Créer le trigger pour les inventaires
CREATE TRIGGER audit_inventaires_trigger
  AFTER UPDATE ON public.inventaires
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_inventaires();