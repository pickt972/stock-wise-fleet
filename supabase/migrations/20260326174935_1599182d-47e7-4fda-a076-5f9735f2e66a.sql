
-- =============================================
-- Accessoires table: baby seats, boosters, etc.
-- =============================================
CREATE TYPE public.accessoire_etat AS ENUM ('bon', 'use', 'a_remplacer', 'en_reparation');

CREATE TABLE public.accessoires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type text NOT NULL, -- 'siege_bebe', 'rehausseur', 'rehausseur_bas', etc.
  etat accessoire_etat NOT NULL DEFAULT 'bon',
  emplacement_actuel text NOT NULL DEFAULT 'CARRERE', -- current location
  notes text,
  actif boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accessoires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view accessoires"
ON public.accessoires FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert accessoires"
ON public.accessoires FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin or creator can update accessoires"
ON public.accessoires FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete accessoires"
ON public.accessoires FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Accessoire transfer history
-- =============================================
CREATE TABLE public.accessoire_transferts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessoire_id uuid NOT NULL REFERENCES public.accessoires(id) ON DELETE CASCADE,
  site_depart text NOT NULL,
  site_arrivee text NOT NULL,
  motif text,
  transferred_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accessoire_transferts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view transfers"
ON public.accessoire_transferts FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can create transfers"
ON public.accessoire_transferts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = transferred_by);

CREATE POLICY "Admin can delete transfers"
ON public.accessoire_transferts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
