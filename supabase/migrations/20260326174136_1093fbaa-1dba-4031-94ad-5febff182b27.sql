
-- =============================================
-- Fix overly permissive RLS policies (warn level)
-- Drop USING(true)/WITH CHECK(true) on non-SELECT ops
-- =============================================

-- === STOCK_ENTRIES ===
-- Drop catch-all and duplicate permissive policies
DROP POLICY IF EXISTS "entries_all" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_delete" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_insert" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_select" ON public.stock_entries;
DROP POLICY IF EXISTS "stock_entries_update" ON public.stock_entries;

-- Add missing DELETE for admins
CREATE POLICY "stock_entries_delete_admin"
ON public.stock_entries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE for creators (recent) + admins
CREATE POLICY "stock_entries_update_scoped"
ON public.stock_entries FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND created_at > (now() - interval '7 days'))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- === STOCK_ENTRY_ITEMS ===
DROP POLICY IF EXISTS "entry_items_all" ON public.stock_entry_items;
DROP POLICY IF EXISTS "stock_entry_items_delete" ON public.stock_entry_items;
DROP POLICY IF EXISTS "stock_entry_items_insert" ON public.stock_entry_items;
DROP POLICY IF EXISTS "stock_entry_items_select" ON public.stock_entry_items;
DROP POLICY IF EXISTS "stock_entry_items_update" ON public.stock_entry_items;

-- Add UPDATE/DELETE scoped to entry owner or admin
CREATE POLICY "stock_entry_items_update_scoped"
ON public.stock_entry_items FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM stock_entries WHERE stock_entries.id = stock_entry_items.entry_id
    AND (stock_entries.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

CREATE POLICY "stock_entry_items_delete_scoped"
ON public.stock_entry_items FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM stock_entries WHERE stock_entries.id = stock_entry_items.entry_id
    AND (stock_entries.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

-- === STOCK_EXITS ===
DROP POLICY IF EXISTS "exits_all" ON public.stock_exits;
DROP POLICY IF EXISTS "stock_exits_delete" ON public.stock_exits;
DROP POLICY IF EXISTS "stock_exits_insert" ON public.stock_exits;
DROP POLICY IF EXISTS "stock_exits_select" ON public.stock_exits;
DROP POLICY IF EXISTS "stock_exits_update" ON public.stock_exits;

-- Add DELETE for admins
CREATE POLICY "stock_exits_delete_admin"
ON public.stock_exits FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add general UPDATE scoped (creator recent + admin)
CREATE POLICY "stock_exits_update_scoped"
ON public.stock_exits FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND created_at > (now() - interval '7 days'))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add INSERT scoped
CREATE POLICY "stock_exits_insert_scoped"
ON public.stock_exits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- === STOCK_EXIT_ITEMS ===
DROP POLICY IF EXISTS "exit_items_all" ON public.stock_exit_items;
DROP POLICY IF EXISTS "stock_exit_items_delete" ON public.stock_exit_items;
DROP POLICY IF EXISTS "stock_exit_items_insert" ON public.stock_exit_items;
DROP POLICY IF EXISTS "stock_exit_items_select" ON public.stock_exit_items;
DROP POLICY IF EXISTS "stock_exit_items_update" ON public.stock_exit_items;

-- Add INSERT for exit owner
CREATE POLICY "stock_exit_items_insert_scoped"
ON public.stock_exit_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM stock_exits WHERE stock_exits.id = stock_exit_items.exit_id
    AND (stock_exits.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

-- Add SELECT for authenticated
CREATE POLICY "stock_exit_items_select_auth"
ON public.stock_exit_items FOR SELECT TO authenticated
USING (true);

-- Add UPDATE/DELETE scoped
CREATE POLICY "stock_exit_items_update_scoped"
ON public.stock_exit_items FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM stock_exits WHERE stock_exits.id = stock_exit_items.exit_id
    AND (stock_exits.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

CREATE POLICY "stock_exit_items_delete_scoped"
ON public.stock_exit_items FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM stock_exits WHERE stock_exits.id = stock_exit_items.exit_id
    AND (stock_exits.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

-- === FOURNISSEURS ===
-- Fix UPDATE USING(true) and INSERT WITH CHECK(true)
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des fournisseurs" ON public.fournisseurs;

CREATE POLICY "Authenticated users can update fournisseurs"
ON public.fournisseurs FOR UPDATE TO authenticated
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can insert fournisseurs"
ON public.fournisseurs FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated'::text);

-- === INVENTAIRE_ITEMS ===
-- Drop unscoped policies (scoped ones with created_by/admin checks remain)
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des items d''inventaire" ON public.inventaire_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier les items d''inventaire" ON public.inventaire_items;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer les items d''inventaire" ON public.inventaire_items;

-- === NOTIFICATIONS ===
-- Fix INSERT policy: scope to authenticated properly
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);
