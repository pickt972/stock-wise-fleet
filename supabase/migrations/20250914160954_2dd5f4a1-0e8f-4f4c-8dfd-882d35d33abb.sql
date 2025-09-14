-- Nettoyer complètement tous les utilisateurs et données associées
-- Supprimer d'abord les rôles utilisateurs
DELETE FROM public.user_roles;

-- Supprimer les profils
DELETE FROM public.profiles;

-- Supprimer tous les utilisateurs auth (ceci va cascade delete les données liées)
-- Note: Cette opération va supprimer tous les utilisateurs de la table auth.users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users
    LOOP
        -- Supprimer chaque utilisateur individuellement pour éviter les erreurs
        DELETE FROM auth.users WHERE id = user_record.id;
    END LOOP;
END $$;