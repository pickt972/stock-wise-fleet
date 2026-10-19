CREATE OR REPLACE FUNCTION public.create_simple_entry_article(p_article jsonb, p_header jsonb, p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_article_id uuid; v_existing public.articles; v_result jsonb;
  v_reference text := nullif(btrim(p_article->>'reference'),'');
  v_name text := nullif(btrim(p_article->>'designation'),'');
  v_category text := nullif(btrim(p_article->>'categorie'),'');
  v_price numeric := (p_article->>'prix_achat')::numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF coalesce(public.is_maintenance(),false) AND NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Application en maintenance'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'La quantité doit être un entier supérieur ou égal à 1'; END IF;
  IF v_reference IS NULL OR v_reference ~* '^(DRAFT-|A-COMPLETER-)' THEN RAISE EXCEPTION 'Renseignez une référence définitive'; END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Le nom de l’article est obligatoire'; END IF;
  IF v_category IS NULL OR v_category = 'À classer' THEN RAISE EXCEPTION 'La catégorie est obligatoire'; END IF;
  IF v_price IS NULL OR v_price < 0 OR v_price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Prix unitaire invalide'; END IF;
  v_article_id := nullif(p_article->>'id','')::uuid;
  IF v_article_id IS NULL THEN
    INSERT INTO public.articles(reference,designation,marque,categorie,sous_categorie,code_barre,stock,prix_achat,user_id,fournisseur_id,is_draft)
    VALUES(v_reference,v_name,'',v_category,nullif(btrim(p_article->>'sous_categorie'),''),nullif(btrim(p_article->>'code_barre'),''),0,v_price,auth.uid(),nullif(p_header->>'supplier_id','')::uuid,false)
    RETURNING id INTO v_article_id;
  ELSE
    SELECT * INTO v_existing FROM public.articles WHERE id=v_article_id AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Article introuvable ou inaccessible'; END IF;
    IF NOT v_existing.is_draft THEN RAISE EXCEPTION 'Cette fiche a déjà été complétée. Sélectionnez à nouveau l’article'; END IF;
    UPDATE public.articles SET reference=v_reference,designation=v_name,categorie=v_category,
      sous_categorie=nullif(btrim(p_article->>'sous_categorie'),''),prix_achat=v_price,is_draft=false
    WHERE id=v_article_id;
  END IF;
  v_result := public.create_stock_entry(p_header,jsonb_build_array(jsonb_build_object('article_id',v_article_id,'quantity',p_quantity,'unit_price',v_price)));
  RETURN v_result || jsonb_build_object('article_id',v_article_id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_simple_entry_article(jsonb,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_simple_entry_article(jsonb,jsonb,integer) TO authenticated, service_role;