CREATE OR REPLACE FUNCTION public.get_stock_entry_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'todayCount',count(*) FILTER(WHERE (entry_date AT TIME ZONE 'America/Martinique')::date = (now() AT TIME ZONE 'America/Martinique')::date),
  'monthCount',count(*) FILTER(WHERE date_trunc('month', entry_date AT TIME ZONE 'America/Martinique') = date_trunc('month', now() AT TIME ZONE 'America/Martinique')),
  'totalValue',COALESCE(sum(total_amount),0)) FROM public.stock_entries WHERE status='active';
$$;
REVOKE ALL ON FUNCTION public.get_stock_entry_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_stock_entry_stats() TO authenticated,service_role;