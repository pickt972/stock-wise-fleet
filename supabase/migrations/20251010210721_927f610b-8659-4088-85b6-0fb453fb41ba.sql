-- Créer une table pour stocker les permissions de manière dynamique
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire sur les permissions
CREATE POLICY "Admins peuvent gérer toutes les permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tous les utilisateurs authentifiés peuvent voir les permissions
CREATE POLICY "Utilisateurs peuvent voir les permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Insérer les permissions par défaut
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Admin
  ('admin', 'manageUsers', true),
  ('admin', 'manageSuppliers', true),
  ('admin', 'manageCategories', true),
  ('admin', 'manageVehicles', true),
  ('admin', 'viewReports', true),
  ('admin', 'manageSettings', true),
  ('admin', 'manageStock', true),
  ('admin', 'createOrders', true),
  ('admin', 'validateOrders', true),
  
  -- Chef d'Agence
  ('chef_agence', 'manageUsers', false),
  ('chef_agence', 'manageSuppliers', true),
  ('chef_agence', 'manageCategories', true),
  ('chef_agence', 'manageVehicles', true),
  ('chef_agence', 'viewReports', true),
  ('chef_agence', 'manageSettings', false),
  ('chef_agence', 'manageStock', true),
  ('chef_agence', 'createOrders', true),
  ('chef_agence', 'validateOrders', false),
  
  -- Magasinier
  ('magasinier', 'manageUsers', false),
  ('magasinier', 'manageSuppliers', false),
  ('magasinier', 'manageCategories', false),
  ('magasinier', 'manageVehicles', false),
  ('magasinier', 'viewReports', false),
  ('magasinier', 'manageSettings', false),
  ('magasinier', 'manageStock', true),
  ('magasinier', 'createOrders', false),
  ('magasinier', 'validateOrders', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();