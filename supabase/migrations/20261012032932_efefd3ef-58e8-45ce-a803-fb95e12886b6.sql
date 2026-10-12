DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('article_fournisseurs','emplacements')
      AND cmd IN ('UPDATE','DELETE') AND permissive='PERMISSIVE'
      AND qual = '((auth.uid() = user_id) OR (auth.uid() = user_id))'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "article_fournisseurs_update_chef_agence" ON public.article_fournisseurs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'chef_agence'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'chef_agence'::app_role));
CREATE POLICY "article_fournisseurs_delete_chef_agence" ON public.article_fournisseurs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'chef_agence'::app_role));
CREATE POLICY "emplacements_update_chef_agence" ON public.emplacements
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'chef_agence'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'chef_agence'::app_role));