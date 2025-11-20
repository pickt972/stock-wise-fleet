-- SUPPRIMER LA CONTRAINTE sur return_status
ALTER TABLE public.stock_exits DROP CONSTRAINT IF EXISTS stock_exits_return_status_check;

-- MESSAGE
SELECT 'Contrainte return_status supprimée' as message;