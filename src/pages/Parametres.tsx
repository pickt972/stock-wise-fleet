import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, BarChart3, Users, Truck, MapPin, Building2, Tags, Mail, Building } from "lucide-react";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import RapportsContent from "@/components/reports/RapportsContent";
import { UsersContent } from "@/components/admin/UsersContent";
import { VehiculesContent } from "@/components/admin/VehiculesContent";
import { EmplacementsContent } from "@/components/admin/EmplacementsContent";
import { FournisseursManagement } from "@/components/fournisseurs/FournisseursManagement";
import { CategoriesManagement } from "@/components/categories/CategoriesManagement";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Parametres() {
  const { permissions } = useRoleAccess();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Paramètres | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Paramètres StockAuto - gérez les utilisateurs, fournisseurs, catégories et véhicules.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Paramètres StockAuto - gérez les utilisateurs, fournisseurs, catégories et véhicules.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gérez les éléments de configuration de l'application
          </p>
        </header>

        <div className="w-full">
          {isMobile ? (
            // Version mobile avec cartes de navigation
            <div className="space-y-4">
              {permissions.manageUsers && (
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('/users')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Users className="h-5 w-5" />
                      Utilisateurs
                    </CardTitle>
                    <CardDescription>Gérez les utilisateurs et leurs rôles</CardDescription>
                  </CardHeader>
                </Card>
              )}

              {permissions.manageSuppliers && (
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('/fournisseurs')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Building2 className="h-5 w-5" />
                      Fournisseurs
                    </CardTitle>
                    <CardDescription>Gérez les fournisseurs et leurs informations</CardDescription>
                  </CardHeader>
                </Card>
              )}

              {permissions.manageCategories && (
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('/categories')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Tags className="h-5 w-5" />
                      Catégories
                    </CardTitle>
                    <CardDescription>Gérez les catégories d'articles</CardDescription>
                  </CardHeader>
                </Card>
              )}

              {permissions.manageVehicles && (
                <Card 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('/vehicules')}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Truck className="h-5 w-5" />
                      Véhicules
                    </CardTitle>
                    <CardDescription>Gérez les véhicules et leurs informations</CardDescription>
                  </CardHeader>
                </Card>
              )}

              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate('/emplacements')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <MapPin className="h-5 w-5" />
                    Emplacements
                  </CardTitle>
                  <CardDescription>Gérez les emplacements de stockage</CardDescription>
                </CardHeader>
              </Card>

              {/* Nouvelles cartes pour entreprise et messagerie */}
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Building className="h-5 w-5" />
                    Informations de l'entreprise
                  </CardTitle>
                  <CardDescription>Paramètres de votre entreprise pour les bons de commande</CardDescription>
                </CardHeader>
                <CardContent>
                  <CompanySettingsForm />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Mail className="h-5 w-5" />
                    Configuration de la messagerie
                  </CardTitle>
                  <CardDescription>Paramètres SMTP/IMAP pour l'envoi d'emails aux fournisseurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <MailSettingsForm />
                </CardContent>
              </Card>
            </div>
          ) : (
            // Version desktop avec onglets
            <Tabs defaultValue="gestion" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gestion" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gestion
                </TabsTrigger>
                <TabsTrigger value="emplacements" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Emplacements
                </TabsTrigger>
                <TabsTrigger value="configuration" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </TabsTrigger>
              </TabsList>

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

              <TabsContent value="configuration" className="space-y-6 mt-6">
                <div className="space-y-6">
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
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}