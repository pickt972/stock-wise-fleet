import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, BarChart3 } from "lucide-react";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import RapportsContent from "@/components/reports/RapportsContent";

export default function Administration() {
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
        </Tabs>
      </main>
    </DashboardLayout>
  );
}