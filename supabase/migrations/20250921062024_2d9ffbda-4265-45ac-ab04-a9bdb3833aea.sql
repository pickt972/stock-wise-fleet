-- Correction ponctuelle du stock suite à un écrasement par l'édition
UPDATE public.articles
SET stock = 3, updated_at = now()
WHERE id = 'bdec1518-6f0c-45e5-870e-5a84a9b07336';