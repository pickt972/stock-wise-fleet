
-- 1. Fournisseurs: restrict INSERT/UPDATE to admin/chef_agence
DROP POLICY IF EXISTS "Authenticated users can insert fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "Authenticated users can update fournisseurs" ON public.fournisseurs;

CREATE POLICY "Admins and chefs can insert fournisseurs"
ON public.fournisseurs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chef_agence'::app_role));

CREATE POLICY "Admins and chefs can update fournisseurs"
ON public.fournisseurs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chef_agence'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'chef_agence'::app_role));

-- 2. notification_settings: DELETE policy
CREATE POLICY "Users can delete their own notification settings"
ON public.notification_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 3. notifications: DELETE policy
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4. user_roles: explicit deny for non-admin INSERT/UPDATE/DELETE
-- The existing "Les admins peuvent tout faire sur les rôles" FOR ALL covers admins.
-- Add restrictive policies to make intent explicit and prevent self-escalation.
CREATE POLICY "Block non-admin role inserts"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin role updates"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin role deletes"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Revoke EXECUTE from anon/PUBLIC on SECURITY DEFINER functions.
-- Trigger functions and internal helpers: revoke from authenticated too.
REVOKE EXECUTE ON FUNCTION public.audit_stock_movements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_articles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_commandes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_inventaires() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_entry_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_entry_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_exit_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_exit_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_commande_numero() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_commande_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_update_commande_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_mail_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_principal_fournisseur() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_company_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_entry_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_exit_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrease_stock_on_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_delete_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_stock_on_delete_entry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_stock_alert_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_inventory_variance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;

-- App-callable functions: revoke from anon/PUBLIC, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_article_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_inventory(location_enum) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scan_item(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_inventory(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.move_category(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_aggregates() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_stock_distribution_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
