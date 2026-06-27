
-- 1. commandes SELECT: owner or admin only
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.commandes;
CREATE POLICY "Users view their own orders or admins view all"
ON public.commandes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. fournisseurs SELECT: admin or chef_agence only
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.fournisseurs;
CREATE POLICY "Admins and chefs d'agence can view suppliers"
ON public.fournisseurs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'chef_agence'::app_role));

-- 3. mail_settings: remove admin SELECT on other users' credentials
DROP POLICY IF EXISTS "Admins can view all mail settings" ON public.mail_settings;
DROP POLICY IF EXISTS "Admins can update all mail settings" ON public.mail_settings;
DROP POLICY IF EXISTS "Admins can delete all mail settings" ON public.mail_settings;

-- 4. storage: restrict listing of company-logos to owner (files still public via direct URL since bucket is public)
DROP POLICY IF EXISTS "Les logos d'entreprise sont publics" ON storage.objects;
CREATE POLICY "Owners can list their company logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Revoke EXECUTE on internal trigger/helper SECURITY DEFINER functions from anon/authenticated/public.
--    Keep RPC entry points and RLS helpers (is_admin, has_role, get_user_role) executable.
REVOKE EXECUTE ON FUNCTION public.generate_entry_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_entry_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_commande_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_update_commande_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_commande_numero() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_mail_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_principal_fournisseur() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_company_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_articles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_commandes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_stock_movements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_inventaires() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_stock_on_delete_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_stock_alert_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_entry_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_exit_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_exit_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrease_stock_on_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_delete_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_exit_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_article_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_inventory_variance() FROM PUBLIC, anon;

-- Revoke anon from RPCs/helpers (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.start_inventory(location_enum) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scan_item(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_inventory(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.move_category(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_aggregates() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_distribution_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
