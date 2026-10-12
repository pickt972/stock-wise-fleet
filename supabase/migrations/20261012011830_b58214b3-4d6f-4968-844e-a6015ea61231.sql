CREATE OR REPLACE FUNCTION public.decrease_stock_on_exit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  exit_creator UUID; exit_vehicule UUID; current_stock INTEGER; article_designation TEXT;
BEGIN
  SELECT stock, designation INTO current_stock, article_designation FROM public.articles WHERE id = NEW.article_id;
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuffisant pour % (actuel: %, demandé: %)', article_designation, current_stock, NEW.quantity;
  END IF;
  SELECT created_by, vehicule_id INTO exit_creator, exit_vehicule FROM public.stock_exits WHERE id = NEW.exit_id;
  UPDATE public.articles SET stock = stock - NEW.quantity, updated_at = NOW() WHERE id = NEW.article_id;
  INSERT INTO public.stock_movements (article_id, type, motif, quantity, user_id, created_by, vehicule_id, created_at)
  VALUES (NEW.article_id, 'sortie', 'Sortie de stock', NEW.quantity, exit_creator, exit_creator, exit_vehicule, NOW());
  RETURN NEW;
END; $$;

ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_created_by_profile_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) NOT VALID;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_user_id_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) NOT VALID;

CREATE POLICY "Le personnel peut voir les profils" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));