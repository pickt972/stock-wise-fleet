ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS motif_annulation text, ADD COLUMN IF NOT EXISTS annule_at timestamptz, ADD COLUMN IF NOT EXISTS annule_by uuid;

DROP POLICY IF EXISTS "Users view their own orders or admins view all" ON public.commandes;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des commandes" ON public.commandes;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les commandes qu'ils ont cré" ON public.commandes;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les commandes qu'ils ont cr" ON public.commandes;

CREATE POLICY commandes_select_staff ON public.commandes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY commandes_insert_own ON public.commandes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));
CREATE POLICY commandes_update_by_role ON public.commandes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'chef_agence')
    OR (status = 'brouillon' AND auth.uid() = user_id)
    OR (status IN ('confirme','envoye','recu_partiel') AND public.is_staff(auth.uid()))
  );
CREATE POLICY commandes_delete_by_role ON public.commandes FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR (status = 'brouillon' AND (auth.uid() = user_id OR public.has_role(auth.uid(),'chef_agence')))
  );

CREATE OR REPLACE FUNCTION public.enforce_commande_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin boolean := public.has_role(auth.uid(),'admin');
  v_chef boolean := public.has_role(auth.uid(),'chef_agence');
BEGIN
  IF auth.uid() IS NULL OR v_admin THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'annule' AND OLD.status <> 'annule' THEN
      IF coalesce(trim(NEW.motif_annulation),'') = '' THEN RAISE EXCEPTION 'Motif d''annulation obligatoire'; END IF;
      NEW.annule_at := now(); NEW.annule_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'brouillon' AND NOT v_chef THEN
      RAISE EXCEPTION 'Seuls un chef d''agence ou un administrateur peuvent valider une commande';
    END IF;
    IF NEW.status = 'annule' THEN RAISE EXCEPTION 'Statut invalide'; END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('annule','recu_complet') THEN
    RAISE EXCEPTION 'Cette commande n''est plus modifiable';
  END IF;

  IF OLD.status <> 'brouillon' THEN
    IF NEW.fournisseur IS DISTINCT FROM OLD.fournisseur OR NEW.email_fournisseur IS DISTINCT FROM OLD.email_fournisseur
       OR NEW.telephone_fournisseur IS DISTINCT FROM OLD.telephone_fournisseur OR NEW.adresse_fournisseur IS DISTINCT FROM OLD.adresse_fournisseur
       OR NEW.tva_taux IS DISTINCT FROM OLD.tva_taux OR NEW.notes IS DISTINCT FROM OLD.notes OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Seul un administrateur peut modifier une commande validée';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'annule' THEN
      IF NOT v_chef OR OLD.status NOT IN ('confirme','envoye') THEN
        RAISE EXCEPTION 'Annulation non autorisée';
      END IF;
      IF coalesce(trim(NEW.motif_annulation),'') = '' THEN RAISE EXCEPTION 'Motif d''annulation obligatoire'; END IF;
      NEW.annule_at := now(); NEW.annule_by := auth.uid();
    ELSIF NEW.status IN ('confirme','envoye') THEN
      IF NOT v_chef THEN RAISE EXCEPTION 'Seuls un chef d''agence ou un administrateur peuvent valider une commande'; END IF;
    ELSIF NEW.status IN ('recu_partiel','recu_complet') THEN
      IF OLD.status NOT IN ('confirme','envoye','recu_partiel') THEN RAISE EXCEPTION 'Réception non autorisée'; END IF;
    ELSIF NEW.status = 'brouillon' THEN
      RAISE EXCEPTION 'Retour en brouillon non autorisé';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_commande_rules ON public.commandes;
CREATE TRIGGER enforce_commande_rules BEFORE INSERT OR UPDATE ON public.commandes
FOR EACH ROW EXECUTE FUNCTION public.enforce_commande_rules();

DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des articles de commande pour l" ON public.commande_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les articles de leurs command" ON public.commande_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les articles de leurs comman" ON public.commande_items;

CREATE POLICY commande_items_insert_by_role ON public.commande_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id AND (
    public.has_role(auth.uid(),'admin')
    OR (c.status = 'brouillon' AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'chef_agence')))
    OR (c.status = 'brouillon' AND false)
  )) OR EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id AND c.user_id = auth.uid() AND c.status IN ('confirme','envoye') AND public.has_role(auth.uid(),'chef_agence')));
CREATE POLICY commande_items_update_by_role ON public.commande_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id AND (
    public.has_role(auth.uid(),'admin')
    OR (c.status = 'brouillon' AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'chef_agence')))
    OR (c.status IN ('confirme','envoye','recu_partiel') AND public.is_staff(auth.uid()))
  )));
CREATE POLICY commande_items_delete_by_role ON public.commande_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id AND (
    public.has_role(auth.uid(),'admin')
    OR (c.status = 'brouillon' AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'chef_agence')))
  )));