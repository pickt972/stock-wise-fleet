-- Activer la permission createOrders pour les magasiniers
UPDATE public.role_permissions 
SET enabled = true 
WHERE role = 'magasinier' AND permission_key = 'createOrders';