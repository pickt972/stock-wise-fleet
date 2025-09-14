-- Corriger la dernière fonction sans search_path

CREATE OR REPLACE FUNCTION public.update_commande_totals(commande_id_param UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_ht_calc DECIMAL(10,2);
  total_ttc_calc DECIMAL(10,2);
  tva_rate DECIMAL(5,2);
BEGIN
  -- Récupérer le taux de TVA de la commande
  SELECT tva_taux INTO tva_rate FROM public.commandes WHERE id = commande_id_param;
  
  -- Calculer le total HT
  SELECT COALESCE(SUM(total_ligne), 0) INTO total_ht_calc
  FROM public.commande_items 
  WHERE commande_id = commande_id_param;
  
  -- Calculer le total TTC
  total_ttc_calc := total_ht_calc * (1 + tva_rate / 100);
  
  -- Mettre à jour la commande
  UPDATE public.commandes 
  SET total_ht = total_ht_calc, 
      total_ttc = total_ttc_calc,
      updated_at = now()
  WHERE id = commande_id_param;
END;
$$;