import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Users, Package, TruckIcon, FileText, Settings, BarChart3 } from "lucide-react";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  admin: boolean;
  chef_agence: boolean;
  magasinier: boolean;
}

export function RolesPermissionsMatrix() {
  const permissions: Permission[] = [
    {
      id: 'manage_users',
      name: 'Gestion des utilisateurs',
      description: 'Créer, modifier et supprimer des utilisateurs',
      icon: <Users className="h-4 w-4" />,
      admin: true,
      chef_agence: false,
      magasinier: false,
    },
    {
      id: 'manage_suppliers',
      name: 'Gestion des fournisseurs',
      description: 'Gérer les fournisseurs et leurs informations',
      icon: <Package className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: false,
    },
    {
      id: 'manage_categories',
      name: 'Gestion des catégories',
      description: 'Créer et modifier les catégories d\'articles',
      icon: <FileText className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: false,
    },
    {
      id: 'manage_vehicles',
      name: 'Gestion des véhicules',
      description: 'Gérer le parc de véhicules',
      icon: <TruckIcon className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: false,
    },
    {
      id: 'view_reports',
      name: 'Consultation des rapports',
      description: 'Accéder aux rapports et statistiques',
      icon: <BarChart3 className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: false,
    },
    {
      id: 'manage_settings',
      name: 'Paramètres système',
      description: 'Configurer les paramètres de l\'application',
      icon: <Settings className="h-4 w-4" />,
      admin: true,
      chef_agence: false,
      magasinier: false,
    },
    {
      id: 'manage_stock',
      name: 'Gestion du stock',
      description: 'Gérer les entrées, sorties et inventaires',
      icon: <Package className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: true,
    },
    {
      id: 'create_orders',
      name: 'Création de commandes',
      description: 'Créer et gérer les bons de commande',
      icon: <FileText className="h-4 w-4" />,
      admin: true,
      chef_agence: true,
      magasinier: false,
    },
    {
      id: 'validate_orders',
      name: 'Validation de commandes',
      description: 'Valider et approuver les commandes',
      icon: <Shield className="h-4 w-4" />,
      admin: true,
      chef_agence: false,
      magasinier: false,
    },
  ];

  const roles: { value: UserRole; label: string; color: string }[] = [
    { value: 'admin', label: 'Administrateur', color: 'bg-destructive text-destructive-foreground' },
    { value: 'chef_agence', label: 'Chef d\'agence', color: 'bg-primary text-primary-foreground' },
    { value: 'magasinier', label: 'Magasinier', color: 'bg-secondary text-secondary-foreground' },
  ];

  const getRoleValue = (permission: Permission, role: UserRole): boolean => {
    return permission[role];
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec badges de rôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Matrice des rôles et permissions
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des permissions accordées à chaque rôle dans l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {roles.map((role) => (
              <Badge key={role.value} className={role.color}>
                {role.label}
              </Badge>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Administrateur :</strong> Accès complet à toutes les fonctionnalités</p>
            <p><strong>Chef d'agence :</strong> Gestion opérationnelle et supervision</p>
            <p><strong>Magasinier :</strong> Gestion du stock et des mouvements</p>
          </div>
        </CardContent>
      </Card>

      {/* Table de permissions - Version desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Permission</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.value} className="text-center">
                      <Badge className={role.color} variant="outline">
                        {role.label}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{permission.icon}</div>
                        <div>
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {permission.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={role.value} className="text-center">
                        {getRoleValue(permission, role.value) ? (
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vue mobile - Cartes par permission */}
      <div className="md:hidden space-y-3">
        {permissions.map((permission) => (
          <Card key={permission.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {permission.icon}
                {permission.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {permission.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.value} className="flex items-center justify-between">
                    <Badge className={role.color} variant="outline">
                      {role.label}
                    </Badge>
                    {getRoleValue(permission, role.value) ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
