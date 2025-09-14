import { useEffect } from "react";
import { AlertTriangle, Package, TrendingDown, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

const allAlerts = [
  {
    id: 1,
    type: "rupture",
    title: "Huile moteur 5W30",
    description: "Stock épuisé - 0 unités",
    priority: "high",
    category: "Consommables",
    date: "2024-01-15"
  },
  {
    id: 2,
    type: "faible",
    title: "Plaquettes de frein avant",
    description: "Stock faible - 2 unités restantes",
    priority: "medium",
    category: "Freinage",
    date: "2024-01-14"
  },
  {
    id: 3,
    type: "faible",
    title: "Batterie 12V 60Ah",
    description: "Stock faible - 3 unités restantes",
    priority: "medium",
    category: "Électrique",
    date: "2024-01-14"
  },
  {
    id: 4,
    type: "rupture",
    title: "Filtre à air",
    description: "Stock épuisé - 0 unités",
    priority: "high",
    category: "Filtration",
    date: "2024-01-13"
  },
  {
    id: 5,
    type: "faible",
    title: "Liquide de refroidissement",
    description: "Stock faible - 1 unité restante",
    priority: "medium",
    category: "Consommables",
    date: "2024-01-12"
  },
  {
    id: 6,
    type: "faible",
    title: "Courroie de distribution",
    description: "Stock faible - 2 unités restantes",
    priority: "medium",
    category: "Transmission",
    date: "2024-01-11"
  }
];

export default function Alertes() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Alertes | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Alertes de stock - gérez les ruptures et stocks faibles dans StockAuto.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Alertes de stock - gérez les ruptures et stocks faibles dans StockAuto.";
      document.head.appendChild(m);
    }
  }, []);

  const highPriorityAlerts = allAlerts.filter(alert => alert.priority === "high");
  const mediumPriorityAlerts = allAlerts.filter(alert => alert.priority === "medium");

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </header>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Alertes de stock
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gérez les ruptures de stock et les niveaux critiques
          </p>
        </div>

        <div className="space-y-6">
          {/* Alertes urgentes */}
          {highPriorityAlerts.length > 0 && (
            <section>
              <Card className="border-destructive bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Alertes urgentes ({highPriorityAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {highPriorityAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 bg-background rounded-lg border border-destructive/20">
                      <div className="flex items-start gap-3 flex-1">
                        <Package className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 min-w-0 flex-1">
                          <h4 className="font-medium text-foreground">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{alert.date}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                        Urgent
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Alertes d'attention */}
          {mediumPriorityAlerts.length > 0 && (
            <section>
              <Card className="border-warning bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-warning flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Stocks faibles ({mediumPriorityAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mediumPriorityAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 bg-background rounded-lg border border-warning/20">
                      <div className="flex items-start gap-3 flex-1">
                        <TrendingDown className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 min-w-0 flex-1">
                          <h4 className="font-medium text-foreground">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{alert.date}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        Attention
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}