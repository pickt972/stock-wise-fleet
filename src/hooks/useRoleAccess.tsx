import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PermissionKey = 'manageUsers' | 'manageSuppliers' | 'manageCategories' | 'manageVehicles' | 'viewReports' | 'manageSettings' | 'manageStock' | 'createOrders' | 'validateOrders';

export function useRoleAccess() {
  const { userRole } = useAuth();
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    manageUsers: false,
    manageSuppliers: false,
    manageCategories: false,
    manageVehicles: false,
    viewReports: false,
    manageSettings: false,
    manageStock: false,
    createOrders: false,
    validateOrders: false,
  });

  useEffect(() => {
    async function fetchPermissions() {
      if (!userRole) {
        setPermissions({
          manageUsers: false,
          manageSuppliers: false,
          manageCategories: false,
          manageVehicles: false,
          viewReports: false,
          manageSettings: false,
          manageStock: false,
          createOrders: false,
          validateOrders: false,
        });
        return;
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key, enabled')
        .eq('role', userRole);

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      const permissionsMap: Record<PermissionKey, boolean> = {
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

      data?.forEach(({ permission_key, enabled }) => {
        if (permission_key in permissionsMap) {
          permissionsMap[permission_key as PermissionKey] = enabled;
        }
      });

      setPermissions(permissionsMap);
    }

    fetchPermissions();
  }, [userRole]);

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