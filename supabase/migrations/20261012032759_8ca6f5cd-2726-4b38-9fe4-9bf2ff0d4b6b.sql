DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des articles" ON public.articles;
CREATE POLICY "articles_insert_authenticated" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND public.is_staff(auth.uid()));