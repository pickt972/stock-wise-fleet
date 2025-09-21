import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RapportsContent from "@/components/reports/RapportsContent";

export default function Administration() {
  useEffect(() => {
    document.title = "Administration | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Administration StockAuto - rapports et analyses.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Administration StockAuto - rapports et analyses.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Administration</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Rapports et analyses de l'application
          </p>
        </header>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapports et analyses</CardTitle>
              <CardDescription>Consultez les rapports détaillés de votre inventaire</CardDescription>
            </CardHeader>
            <CardContent>
              <RapportsContent />
            </CardContent>
          </Card>
        </section>
      </main>
    </DashboardLayout>
  );
}