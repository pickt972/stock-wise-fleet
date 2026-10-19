ALTER FUNCTION public.create_simple_entry_article(jsonb,jsonb,integer) SET SCHEMA stock_internal;
CREATE FUNCTION public.create_simple_entry_article(p_article jsonb,p_header jsonb,p_quantity integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public
AS $$ SELECT stock_internal.create_simple_entry_article(p_article,p_header,p_quantity); $$;
REVOKE ALL ON FUNCTION public.create_simple_entry_article(jsonb,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_simple_entry_article(jsonb,jsonb,integer) TO authenticated,service_role;