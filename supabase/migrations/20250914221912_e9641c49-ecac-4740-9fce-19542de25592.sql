-- Ajouter le trigger pour s'assurer qu'un seul paramètre de messagerie est actif par utilisateur
CREATE TRIGGER ensure_single_active_mail_setting_trigger
BEFORE INSERT OR UPDATE OF is_active ON public.mail_settings
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_mail_setting();