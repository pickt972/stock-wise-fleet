-- Corriger les fonctions avec le search_path pour les warnings de sécurité

-- Fonction pour générer un numéro de commande automatique
CREATE OR REPLACE FUNCTION public.generate_commande_numero()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_commande IS NULL OR NEW.numero_commande = '' THEN
    NEW.numero_commande := 'CMD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('commande_sequence')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Fonction pour recalculer les totaux automatiquement
CREATE OR REPLACE FUNCTION public.trigger_update_commande_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_commande_totals(OLD.commande_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_commande_totals(NEW.commande_id);
    RETURN NEW;
  END IF;
END;
$$;