import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, BarChart3, Users, Truck, MapPin, Building2, Tags } from "lucide-react";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import RapportsContent from "@/components/reports/RapportsContent";
import { UsersContent } from "@/components/admin/UsersContent";
import { VehiculesContent } from "@/components/admin/VehiculesContent";
import { EmplacementsContent } from "@/components/admin/EmplacementsContent";
import { FournisseursManagement } from "@/components/fournisseurs/FournisseursManagement";
import { CategoriesManagement } from "@/components/categories/CategoriesManagement";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function Administration() {
  const { permissions } = useRoleAccess();

  useEffect(() => {
    document.title = "Administration | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Administration StockAuto - gérez les rapports et paramètres.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Administration StockAuto - gérez les rapports et paramètres.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Administration</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gérez les rapports et paramètres de l'application
          </p>
        </header>

        <Tabs defaultValue="rapports" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rapports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Rapports
            </TabsTrigger>
            <TabsTrigger value="parametres" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rapports" className="space-y-6 mt-6">
            <RapportsContent />
          </TabsContent>

          <TabsContent value="parametres" className="space-y-6 mt-6">
            <Tabs defaultValue="configuration" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="configuration" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="gestion" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gestion
                </TabsTrigger>
                <TabsTrigger value="emplacements" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Emplacements
                </TabsTrigger>
              </TabsList>

              <TabsContent value="configuration" className="space-y-6 mt-6">
                <section className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informations de l'entreprise</CardTitle>
                      <CardDescription>Paramètres de votre entreprise pour les bons de commande</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompanySettingsForm />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Configuration de la messagerie</CardTitle>
                      <CardDescription>Paramètres SMTP/IMAP pour l'envoi d'emails aux fournisseurs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MailSettingsForm />
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>

              <TabsContent value="gestion" className="space-y-6 mt-6">
                <Tabs defaultValue="utilisateurs" className="w-full">
                  <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                    {permissions.manageUsers && (
                      <TabsTrigger value="utilisateurs" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Utilisateurs
                      </TabsTrigger>
                    )}
                    {permissions.manageSuppliers && (
                      <TabsTrigger value="fournisseurs" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Fournisseurs
                      </TabsTrigger>
                    )}
                    {permissions.manageCategories && (
                      <TabsTrigger value="categories" className="flex items-center gap-2">
                        <Tags className="h-4 w-4" />
                        Catégories
                      </TabsTrigger>
                    )}
                    {permissions.manageVehicles && (
                      <TabsTrigger value="vehicules" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Véhicules
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {permissions.manageUsers && (
                    <TabsContent value="utilisateurs" className="space-y-6 mt-6">
                      <UsersContent />
                    </TabsContent>
                  )}

                  {permissions.manageSuppliers && (
                    <TabsContent value="fournisseurs" className="space-y-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Gestion des fournisseurs</CardTitle>
                          <CardDescription>Gérez les fournisseurs et leurs informations</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <FournisseursManagement />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {permissions.manageCategories && (
                    <TabsContent value="categories" className="space-y-6 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Gestion des catégories</CardTitle>
                          <CardDescription>Gérez les catégories d'articles</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CategoriesManagement />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {permissions.manageVehicles && (
                    <TabsContent value="vehicules" className="space-y-6 mt-6">
                      <VehiculesContent />
                    </TabsContent>
                  )}
                </Tabs>
              </TabsContent>

              <TabsContent value="emplacements" className="space-y-6 mt-6">
                <EmplacementsContent />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
}