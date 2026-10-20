ALTER FUNCTION public.add_inventory_article(uuid,uuid,integer) SET SCHEMA stock_internal;
REVOKE ALL ON FUNCTION stock_internal.add_inventory_article(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION stock_internal.add_inventory_article(uuid,uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.add_inventory_article(p_inventaire_id uuid, p_article_id uuid, p_qty integer)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT stock_internal.add_inventory_article(p_inventaire_id, p_article_id, p_qty); $$;
REVOKE ALL ON FUNCTION public.add_inventory_article(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_inventory_article(uuid,uuid,integer) TO authenticated;