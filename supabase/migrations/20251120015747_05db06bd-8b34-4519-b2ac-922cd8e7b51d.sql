-- Rendre user_id optionnel dans stock_movements
ALTER TABLE public.stock_movements ALTER COLUMN user_id DROP NOT NULL;

-- Message de confirmation
SELECT 'user_id dans stock_movements est maintenant optionnel' as message;