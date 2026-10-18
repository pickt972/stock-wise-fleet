CREATE SCHEMA IF NOT EXISTS stock_internal;
REVOKE ALL ON SCHEMA stock_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA stock_internal TO authenticated, service_role;
ALTER FUNCTION public.receive_stock_order(uuid,jsonb) SET SCHEMA stock_internal;
CREATE OR REPLACE FUNCTION public.receive_stock_order(p_commande_id uuid,p_lines jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT stock_internal.receive_stock_order(p_commande_id,p_lines); $$;
REVOKE ALL ON FUNCTION public.receive_stock_order(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_stock_order(uuid,jsonb) TO authenticated,service_role;