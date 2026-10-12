CREATE OR REPLACE FUNCTION public.open_inventory(p_label text, p_scope_type text, p_scope_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid(); v_id uuid; v_ref text; v_seq int; v_year text := to_char(now(),'YYYY');
  v_cat_nom text; v_cat_parent uuid; v_total int;
BEGIN
  IF v_uid IS NULL OR NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF public.is_maintenance() AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
  IF EXISTS (SELECT 1 FROM inventaires WHERE statut='en_cours') THEN
    RAISE EXCEPTION 'Un inventaire est déjà en cours. Clôturez-le ou abandonnez-le avant d''en ouvrir un nouveau.'; END IF;
  IF p_scope_type NOT IN ('all','category','location') THEN RAISE EXCEPTION 'Périmètre invalide'; END IF;
  IF p_scope_type <> 'all' AND p_scope_id IS NULL THEN RAISE EXCEPTION 'Périmètre à préciser'; END IF;

  IF p_scope_type = 'category' THEN
    SELECT c.nom, c.parent_id INTO v_cat_nom, v_cat_parent FROM categories c WHERE c.id = p_scope_id;
    IF v_cat_nom IS NULL THEN RAISE EXCEPTION 'Catégorie introuvable'; END IF;
  END IF;

  SELECT COALESCE(MAX(NULLIF(split_part(reference,'-',3),'')::int),0)+1 INTO v_seq
    FROM inventaires WHERE reference LIKE 'INV-'||v_year||'-%';
  v_ref := 'INV-'||v_year||'-'||lpad(v_seq::text,3,'0');

  INSERT INTO inventaires(reference,label,scope_type,scope_id,statut,status,created_by,started_by,opened_at,started_at,date_inventaire)
  VALUES (v_ref, NULLIF(trim(p_label),''), p_scope_type, p_scope_id,'en_cours','OPEN',v_uid,v_uid,now(),now(),current_date)
  RETURNING id INTO v_id;

  INSERT INTO inventaire_items(inventaire_id, article_id, stock_theorique, emplacement_id, created_by)
  SELECT v_id, a.id, a.stock, a.emplacement_id, v_uid FROM articles a
  WHERE a.archived_at IS NULL
    AND (p_scope_type = 'all'
      OR (p_scope_type = 'location' AND a.emplacement_id = p_scope_id)
      OR (p_scope_type = 'category' AND (
            (v_cat_parent IS NULL AND a.categorie = v_cat_nom)
         OR (v_cat_parent IS NOT NULL AND a.sous_categorie = v_cat_nom))));
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total = 0 THEN RAISE EXCEPTION 'Aucun article dans ce périmètre'; END IF;
  UPDATE inventaires SET total_articles = v_total WHERE id = v_id;
  PERFORM log_audit('INVENTORY_OPEN','inventaires',v_id,NULL,jsonb_build_object('reference',v_ref,'scope_type',p_scope_type,'total',v_total));
  RETURN v_id;
END $$;