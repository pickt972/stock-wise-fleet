import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";

export default function Parametres() {
  useEffect(() => {
    document.title = "Paramètres | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Paramètres de l\'application StockAuto - gérez les préférences et options.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Paramètres de l'application StockAuto - gérez les préférences et options.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gérez les préférences de l'application</p>
        </header>

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
      </main>
    </DashboardLayout>
  );
}