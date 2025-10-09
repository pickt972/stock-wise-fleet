-- Ajouter les champs OAuth aux paramètres de messagerie
ALTER TABLE public.mail_settings
ADD COLUMN auth_type text NOT NULL DEFAULT 'smtp' CHECK (auth_type IN ('smtp', 'oauth')),
ADD COLUMN access_token text,
ADD COLUMN refresh_token text,
ADD COLUMN token_expiry timestamptz;

-- Créer un index pour retrouver rapidement les tokens à rafraîchir
CREATE INDEX idx_mail_settings_token_expiry ON public.mail_settings(token_expiry) WHERE auth_type = 'oauth';