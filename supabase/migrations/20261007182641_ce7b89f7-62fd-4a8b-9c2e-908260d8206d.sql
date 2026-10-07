CREATE OR REPLACE FUNCTION public.update_article_stock(article_id uuid, quantity_change integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'chef_agence') OR public.has_role(auth.uid(),'magasinier')) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  IF public.is_maintenance() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées';
  END IF;
  UPDATE public.articles SET stock = stock + quantity_change, updated_at = now() WHERE id = article_id;
  IF (SELECT stock FROM public.articles WHERE id = article_id) < 0 THEN
    RAISE EXCEPTION 'Le stock ne peut pas être négatif';
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.update_article_stock(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_article_stock(uuid, integer) TO authenticated;