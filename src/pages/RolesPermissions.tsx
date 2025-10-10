import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { RolesPermissionsMatrix } from "@/components/roles/RolesPermissionsMatrix";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function RolesPermissions() {
  const { permissions } = useRoleAccess();

  useEffect(() => {
    document.title = "Rôles et Permissions | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Matrice des rôles et permissions - gérez les accès par rôle utilisateur.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Matrice des rôles et permissions - gérez les accès par rôle utilisateur.";
      document.head.appendChild(m);
    }
  }, []);

  // Vérifier que l'utilisateur est admin
  if (!permissions.manageUsers) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <p>Accès restreint aux administrateurs</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Rôles et Permissions</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Consultez les permissions accordées à chaque rôle dans l'application
          </p>
        </header>

        <RolesPermissionsMatrix />
      </main>
    </DashboardLayout>
  );
}
