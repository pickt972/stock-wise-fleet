
-- ============================================
-- 1. Fix notifications RLS: scope SELECT and UPDATE
-- ============================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;

-- Scoped SELECT: users see only notifications they created or admins see all
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Scoped UPDATE: users can only update their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 2. Fix profiles role escalation: prevent non-admins from changing role
-- ============================================

-- Drop the current user self-update policy (no WITH CHECK)
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;

-- Recreate with WITH CHECK that prevents role changes by non-admins
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- Either the role hasn't changed
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    -- Or the user is an admin
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
