import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Users, Package, FolderTree, Car, FileText, Settings, Boxes, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';
type PermissionKey = 'manageUsers' | 'manageSuppliers' | 'manageCategories' | 'manageVehicles' | 'viewReports' | 'manageSettings' | 'manageStock' | 'createOrders' | 'validateOrders';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: any;
  key: PermissionKey;
}

interface RolePermission {
  role: UserRole;
  permission_key: string;
  enabled: boolean;
}

const permissions: Permission[] = [
  {
    id: 'manageUsers',
    key: 'manageUsers',
    name: 'Gestion des utilisateurs',
    description: 'Créer, modifier et supprimer des utilisateurs',
    icon: Users,
  },
  {
    id: 'manageSuppliers',
    key: 'manageSuppliers',
    name: 'Gestion des fournisseurs',
    description: 'Gérer les fournisseurs et leurs informations',
    icon: Package,
  },
  {
    id: 'manageCategories',
    key: 'manageCategories',
    name: 'Gestion des catégories',
    description: 'Créer et modifier les catégories d\'articles',
    icon: FolderTree,
  },
  {
    id: 'manageVehicles',
    key: 'manageVehicles',
    name: 'Gestion des véhicules',
    description: 'Gérer le parc de véhicules',
    icon: Car,
  },
  {
    id: 'viewReports',
    key: 'viewReports',
    name: 'Accès aux rapports',
    description: 'Consulter les rapports et statistiques',
    icon: FileText,
  },
  {
    id: 'manageSettings',
    key: 'manageSettings',
    name: 'Paramètres système',
    description: 'Configurer les paramètres de l\'application',
    icon: Settings,
  },
  {
    id: 'manageStock',
    key: 'manageStock',
    name: 'Gestion du stock',
    description: 'Gérer les entrées et sorties de stock',
    icon: Boxes,
  },
  {
    id: 'createOrders',
    key: 'createOrders',
    name: 'Créer des commandes',
    description: 'Créer et modifier des commandes',
    icon: ShoppingCart,
  },
  {
    id: 'validateOrders',
    key: 'validateOrders',
    name: 'Valider des commandes',
    description: 'Valider et approuver les commandes',
    icon: CheckCircle2,
  },
];

const roles: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrateur', color: 'bg-destructive text-destructive-foreground' },
  { value: 'chef_agence', label: 'Chef d\'Agence', color: 'bg-primary text-primary-foreground' },
  { value: 'magasinier', label: 'Magasinier', color: 'bg-secondary text-secondary-foreground' },
];

export function PermissionsManagement() {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission_key, enabled');

      if (error) throw error;

      setRolePermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function togglePermission(role: UserRole, permissionKey: PermissionKey) {
    const key = `${role}-${permissionKey}`;
    setUpdating(key);

    try {
      const currentPermission = rolePermissions.find(
        p => p.role === role && p.permission_key === permissionKey
      );

      const newEnabled = !currentPermission?.enabled;

      const { error } = await supabase
        .from('role_permissions')
        .update({ enabled: newEnabled })
        .eq('role', role)
        .eq('permission_key', permissionKey);

      if (error) throw error;

      setRolePermissions(prev => prev.map(p =>
        p.role === role && p.permission_key === permissionKey
          ? { ...p, enabled: newEnabled }
          : p
      ));

      toast({
        title: "Permission modifiée",
        description: `Permission ${newEnabled ? 'activée' : 'désactivée'} pour ${roles.find(r => r.value === role)?.label}`
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la permission",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  }

  function isPermissionEnabled(role: UserRole, permissionKey: PermissionKey): boolean {
    return rolePermissions.find(
      p => p.role === role && p.permission_key === permissionKey
    )?.enabled || false;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Configuration des Permissions</CardTitle>
        </div>
        <CardDescription>
          Activez ou désactivez les permissions pour chaque rôle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {permissions.map((permission) => {
            const Icon = permission.icon;
            return (
              <div key={permission.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{permission.name}</h4>
                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 ml-14">
                  {roles.map((role) => {
                    const key = `${role.value}-${permission.key}`;
                    const enabled = isPermissionEnabled(role.value, permission.key);
                    const isUpdating = updating === key;

                    return (
                      <div key={role.value} className="flex items-center justify-between sm:flex-1">
                        <Badge className={role.color} variant="secondary">
                          {role.label}
                        </Badge>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => togglePermission(role.value, permission.key)}
                          disabled={isUpdating}
                          className="ml-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
