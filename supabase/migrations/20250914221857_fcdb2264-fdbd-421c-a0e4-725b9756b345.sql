-- Créer une table pour les paramètres de messagerie
CREATE TABLE public.mail_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL,
  smtp_password TEXT, -- Crypté côté application
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  imap_username TEXT,
  imap_password TEXT, -- Crypté côté application
  use_tls BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false, -- Une seule config active par utilisateur
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mail_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own mail settings" 
ON public.mail_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mail settings" 
ON public.mail_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mail settings" 
ON public.mail_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mail settings" 
ON public.mail_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger pour les timestamps
CREATE TRIGGER update_mail_settings_updated_at
BEFORE UPDATE ON public.mail_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour s'assurer qu'un seul paramètre de messagerie est actif par utilisateur
CREATE OR REPLACE FUNCTION public.ensure_single_active_mail_setting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Désactiver toutes les autres configurations pour cet utilisateur
    UPDATE public.mail_settings 
    SET is_active = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;