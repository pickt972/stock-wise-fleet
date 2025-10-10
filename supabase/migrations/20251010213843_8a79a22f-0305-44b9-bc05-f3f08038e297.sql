-- Corriger les fonctions restantes avec search_path manquant
ALTER FUNCTION public.generate_commande_numero() SET search_path = public;
ALTER FUNCTION public.ensure_single_active_mail_setting() SET search_path = public;
ALTER FUNCTION public.ensure_single_principal_fournisseur() SET search_path = public;
ALTER FUNCTION public.ensure_single_active_company_setting() SET search_path = public;
ALTER FUNCTION public.calculate_inventory_variance() SET search_path = public;