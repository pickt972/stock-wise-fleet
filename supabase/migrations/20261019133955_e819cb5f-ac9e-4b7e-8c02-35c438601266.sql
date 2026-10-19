DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('stock_internal.create_simple_entry_article(jsonb,jsonb,integer)'::regprocedure) INTO definition;
 definition := replace(definition,
 'IF NOT v_existing.is_draft THEN',
 'IF v_existing.user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), ''chef_agence'') AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION ''Permission refusée pour compléter cette fiche''; END IF;
    IF NOT v_existing.is_draft THEN');
 EXECUTE definition;
END;
$migration$;