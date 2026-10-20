CREATE OR REPLACE FUNCTION public.add_inventory_article(p_inventaire_id uuid, p_article_id uuid, p_qty integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_item uuid; v_stock int; v_emp uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  IF p_qty IS NULL OR p_qty < 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  PERFORM 1 FROM inventaires WHERE id=p_inventaire_id AND statut='en_cours' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventaire non modifiable'; END IF;
  SELECT stock, emplacement_id INTO v_stock, v_emp FROM articles WHERE id=p_article_id AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article introuvable'; END IF;
  INSERT INTO inventaire_items(inventaire_id, article_id, stock_theorique, emplacement_id, created_by, stock_compte, ecart, counted_by, date_comptage)
  VALUES (p_inventaire_id, p_article_id, v_stock, v_emp, v_uid, p_qty, p_qty - v_stock, v_uid, now())
  ON CONFLICT (inventaire_id, article_id) DO UPDATE SET stock_compte = EXCLUDED.stock_compte,
    ecart = EXCLUDED.stock_compte - inventaire_items.stock_theorique, counted_by = v_uid, date_comptage = now()
  RETURNING id INTO v_item;
  UPDATE inventaires SET
    total_articles = (SELECT count(*) FROM inventaire_items WHERE inventaire_id=p_inventaire_id),
    articles_counted = (SELECT count(*) FROM inventaire_items WHERE inventaire_id=p_inventaire_id AND stock_compte IS NOT NULL)
   WHERE id = p_inventaire_id;
  PERFORM log_audit('INVENTORY_ADD_ARTICLE','inventaires',p_inventaire_id,NULL,jsonb_build_object('article_id',p_article_id,'qty',p_qty));
  RETURN v_item;
END $$;
REVOKE ALL ON FUNCTION public.add_inventory_article(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_inventory_article(uuid,uuid,integer) TO authenticated;