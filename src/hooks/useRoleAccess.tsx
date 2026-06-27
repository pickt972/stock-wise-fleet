import { useAuth } from "./useAuth";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PermissionKey = 'manageUsers' | 'manageSuppliers' | 'manageCategories' | 'manageVehicles' | 'viewReports' | 'manageSettings' | 'manageStock' | 'createOrders' | 'validateOrders';

const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  manageUsers: false,
  manageSuppliers: false,
  manageCategories: false,
  manageVehicles: false,
  viewReports: false,
  manageSettings: false,
  manageStock: false,
  createOrders: false,
  validateOrders: false,
};

export function useRoleAccess() {
  const { userRole } = useAuth();

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions', userRole],
    queryFn: async () => {
      if (!userRole) return null;
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key, enabled')
        .eq('role', userRole);
      if (error) {
        console.error('Error fetching permissions:', error);
        return null;
      }
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!userRole,
  });

  const permissions = useMemo<Record<PermissionKey, boolean>>(() => {
    const map = { ...DEFAULT_PERMISSIONS };
    permissionsData?.forEach(({ permission_key, enabled }) => {
      if (permission_key in map) {
        map[permission_key as PermissionKey] = enabled;
      }
    });
    return map;
  }, [permissionsData]);

  const hasRole = (requiredRole: 'admin' | 'chef_agence' | 'magasinier') => {
    return userRole === requiredRole;
  };

  const hasAnyRole = (requiredRoles: ('admin' | 'chef_agence' | 'magasinier')[]) => {
    return userRole ? requiredRoles.includes(userRole) : false;
  };

  const isAdmin = () => userRole === 'admin';
  const isChefAgence = () => userRole === 'chef_agence';
  const isMagasinier = () => userRole === 'magasinier';

  return {
    userRole,
    hasRole,
    hasAnyRole,
    isAdmin,
    isChefAgence,
    isMagasinier,
    permissions
  };
}
