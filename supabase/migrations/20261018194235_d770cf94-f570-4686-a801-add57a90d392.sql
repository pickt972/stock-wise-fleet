CREATE OR REPLACE FUNCTION public.create_stock_entry(p_header jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_entry public.stock_entries; v_item jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Ajoutez au moins un article'; END IF;
  IF p_header->>'entry_type' = 'achat' AND NULLIF(p_header->>'supplier_id','') IS NULL THEN RAISE EXCEPTION 'Le fournisseur est obligatoire pour un achat'; END IF;
  INSERT INTO public.stock_entries(entry_number,entry_type,entry_date,supplier_id,invoice_number,location,notes,created_by)
  VALUES ('',p_header->>'entry_type',COALESCE(NULLIF(p_header->>'entry_date','')::timestamptz,now()),NULLIF(p_header->>'supplier_id','')::uuid,NULLIF(p_header->>'invoice_number',''),NULLIF(p_header->>'location',''),p_header->>'notes',auth.uid()) RETURNING * INTO v_entry;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.stock_entry_items(entry_id,article_id,quantity,unit_price)
    VALUES(v_entry.id,(v_item->>'article_id')::uuid,(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric);
  END LOOP;
  RETURN jsonb_build_object('id',v_entry.id,'entry_number',v_entry.entry_number);
END $$;
REVOKE ALL ON FUNCTION public.create_stock_entry(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_entry(jsonb,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.receive_stock_order(p_commande_id uuid, p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.commandes; v_line public.commande_items; v_article public.articles;
 v_input jsonb; v_new jsonb; v_article_id uuid; v_entry_id uuid; v_qty integer; v_price numeric;
 v_status public.commande_status; v_ref text; v_complete boolean; v_seen uuid[] := '{}';
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
 IF public.is_maintenance() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'maintenance_mode: écritures temporairement désactivées'; END IF;
 SELECT * INTO v_order FROM public.commandes WHERE id=p_commande_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
 IF v_order.status NOT IN ('confirme','envoye','recu_partiel') THEN RAISE EXCEPTION 'Réception non autorisée pour cette commande'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Choisissez au moins une ligne à réceptionner'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('stock-entry-reception'));
 INSERT INTO public.stock_entries(entry_number,entry_type,invoice_number,notes,created_by)
 VALUES('','reception',v_order.numero_commande,'Réception commande '||v_order.numero_commande,auth.uid()) RETURNING id INTO v_entry_id;
 FOR v_input IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
   SELECT * INTO v_line FROM public.commande_items WHERE id=(v_input->>'id')::uuid AND commande_id=p_commande_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Ligne de commande introuvable'; END IF;
   IF v_line.id=ANY(v_seen) THEN RAISE EXCEPTION 'Ligne de réception en double'; END IF;
   v_seen:=array_append(v_seen,v_line.id);
   v_qty:=(v_input->>'quantity')::integer;
   v_price:=(v_input->>'unit_price')::numeric;
   IF v_qty IS NULL OR v_qty<1 OR v_qty>v_line.quantite_commandee-v_line.quantite_recue THEN RAISE EXCEPTION 'Quantité reçue invalide : vérifiez le reste à recevoir'; END IF;
   IF v_price IS NULL OR v_price<0 THEN RAISE EXCEPTION 'Prix unitaire invalide'; END IF;
   v_new:=v_input->'new_article';
   v_article_id:=COALESCE(NULLIF(v_input->>'article_id','')::uuid,v_line.article_id);
   IF v_new IS NOT NULL AND v_new <> 'null'::jsonb THEN
     v_ref:=NULLIF(trim(v_new->>'reference'),'');
     IF v_ref IS NULL THEN
       PERFORM pg_advisory_xact_lock(hashtext('draft-article-reference'));
       SELECT 'DRAFT-'||to_char(now(),'YYYYMMDD')||'-'||lpad((COALESCE(MAX(NULLIF(split_part(reference,'-',3),'')::integer),0)+1)::text,3,'0') INTO v_ref
       FROM public.articles WHERE reference ~ ('^DRAFT-'||to_char(now(),'YYYYMMDD')||'-[0-9]+$');
     END IF;
     v_complete:=v_ref !~ '^(DRAFT-|A-COMPLETER-)' AND COALESCE(trim(v_new->>'marque'),'')<>'' AND COALESCE(trim(v_new->>'categorie'),'') NOT IN ('','À classer') AND COALESCE(trim(v_new->>'code_barre'),'')<>'';
     IF v_article_id IS NULL THEN
       INSERT INTO public.articles(designation,reference,marque,categorie,sous_categorie,code_barre,prix_achat,stock,stock_min,stock_max,is_draft,user_id,emplacement_id)
       VALUES(COALESCE(NULLIF(trim(v_new->>'designation'),''),v_line.designation),v_ref,COALESCE(trim(v_new->>'marque'),''),COALESCE(NULLIF(v_new->>'categorie',''),'À classer'),NULLIF(v_new->>'sous_categorie',''),NULLIF(trim(v_new->>'code_barre'),''),v_price,0,0,0,NOT v_complete,auth.uid(),NULLIF(v_new->>'emplacement_id','')::uuid) RETURNING id INTO v_article_id;
     ELSE
       SELECT * INTO v_article FROM public.articles WHERE id=v_article_id AND archived_at IS NULL FOR UPDATE;
       IF NOT FOUND THEN RAISE EXCEPTION 'Article introuvable'; END IF;
       IF NOT v_article.is_draft THEN RAISE EXCEPTION 'La fiche de cet article est déjà complète'; END IF;
       UPDATE public.articles SET designation=COALESCE(NULLIF(trim(v_new->>'designation'),''),designation),reference=v_ref,marque=COALESCE(trim(v_new->>'marque'),''),categorie=COALESCE(NULLIF(v_new->>'categorie',''),'À classer'),sous_categorie=NULLIF(v_new->>'sous_categorie',''),code_barre=NULLIF(trim(v_new->>'code_barre'),''),prix_achat=v_price,is_draft=NOT v_complete WHERE id=v_article_id;
     END IF;
   END IF;
   SELECT * INTO v_article FROM public.articles WHERE id=v_article_id AND archived_at IS NULL FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Choisissez un article existant ou créez une fiche'; END IF;
   IF v_line.vehicule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.article_vehicules WHERE article_id=v_article_id AND vehicule_id=v_line.vehicule_id) THEN
     INSERT INTO public.article_vehicules(article_id,vehicule_id,user_id) VALUES(v_article_id,v_line.vehicule_id,auth.uid());
   END IF;
   INSERT INTO public.stock_entry_items(entry_id,article_id,quantity,unit_price) VALUES(v_entry_id,v_article_id,v_qty,v_price);
   UPDATE public.commande_items SET article_id=v_article_id,quantite_recue=quantite_recue+v_qty,prix_unitaire=v_price,total_ligne=quantite_commandee*v_price,reference=v_article.reference,code_barre=v_article.code_barre,is_draft=v_article.is_draft WHERE id=v_line.id;
 END LOOP;
 SELECT CASE WHEN bool_and(quantite_recue>=quantite_commandee) THEN 'recu_complet'::public.commande_status ELSE 'recu_partiel'::public.commande_status END INTO v_status FROM public.commande_items WHERE commande_id=p_commande_id;
 UPDATE public.commandes SET status=v_status,date_reception_reelle=CASE WHEN v_status='recu_complet' THEN now() ELSE NULL END WHERE id=p_commande_id;
 RETURN jsonb_build_object('entry_id',v_entry_id,'status',v_status);
END $$;
REVOKE ALL ON FUNCTION public.receive_stock_order(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_stock_order(uuid,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_stock_entry_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object('todayCount',count(*) FILTER(WHERE entry_date>=date_trunc('day',now())), 'monthCount',count(*) FILTER(WHERE entry_date>=date_trunc('month',now())), 'totalValue',COALESCE(sum(total_amount),0)) FROM public.stock_entries WHERE status='active';
$$;
REVOKE ALL ON FUNCTION public.get_stock_entry_stats() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_stock_entry_stats() TO authenticated,service_role;