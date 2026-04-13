
-- Allow admins to view all mail settings
CREATE POLICY "Admins can view all mail settings"
ON public.mail_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update all mail settings
CREATE POLICY "Admins can update all mail settings"
ON public.mail_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete all mail settings
CREATE POLICY "Admins can delete all mail settings"
ON public.mail_settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
