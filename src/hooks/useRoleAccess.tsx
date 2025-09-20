import { useAuth } from "./useAuth";

export function useRoleAccess() {
  const { userRole } = useAuth();

  const hasRole = (requiredRole: 'admin' | 'chef_agence' | 'magasinier') => {
    return userRole === requiredRole;
  };

  const hasAnyRole = (requiredRoles: ('admin' | 'chef_agence' | 'magasinier')[]) => {
    return userRole ? requiredRoles.includes(userRole) : false;
  };

  const isAdmin = () => userRole === 'admin';
  const isChefAgence = () => userRole === 'chef_agence';
  const isMagasinier = () => userRole === 'magasinier';

  // Permissions par fonctionnalité
  const canManageUsers = () => isAdmin();
  const canManageSuppliers = () => isAdmin() || isChefAgence();
  const canManageCategories = () => isAdmin() || isChefAgence();
  const canManageVehicles = () => isAdmin() || isChefAgence();
  const canViewReports = () => isAdmin() || isChefAgence();
  const canManageSettings = () => isAdmin();
  const canManageStock = () => true; // Tous les rôles
  const canCreateOrders = () => isAdmin() || isChefAgence();
  const canValidateOrders = () => isAdmin();

  return {
    userRole,
    hasRole,
    hasAnyRole,
    isAdmin,
    isChefAgence,
    isMagasinier,
    permissions: {
      manageUsers: canManageUsers(),
      manageSuppliers: canManageSuppliers(),
      manageCategories: canManageCategories(),
      manageVehicles: canManageVehicles(),
      viewReports: canViewReports(),
      manageSettings: canManageSettings(),
      manageStock: canManageStock(),
      createOrders: canCreateOrders(),
      validateOrders: canValidateOrders(),
    }
  };
}