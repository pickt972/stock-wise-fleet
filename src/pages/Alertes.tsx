import { useEffect } from "react";
import { AlertTriangle, Package, TrendingDown, ArrowLeft, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { useAlerts, Alert } from "@/hooks/useAlerts";

export default function Alertes() {
  const navigate = useNavigate();
  const { highPriorityAlerts, mediumPriorityAlerts, isLoading } = useAlerts();

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

  const handleCreateOrderForAlerts = (alertsGroup: Alert[]) => {
    // Préparer les articles pour la commande
    const articlesForOrder = alertsGroup.map(alert => ({
      article_id: alert.article.id,
      designation: alert.article.designation,
      reference: alert.article.reference,
      quantite_commandee: alert.type === "rupture" ? Math.max(alert.article.stock_min * 2, 10) : alert.article.stock_min - alert.article.stock + 5,
      prix_unitaire: alert.article.prix_achat,
      total_ligne: 0 // Sera calculé automatiquement
    }));

    // Naviguer vers la page commandes avec les articles pré-remplis
    navigate('/commandes', { 
      state: { 
        prefilledItems: articlesForOrder,
        source: 'alerts'
      } 
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement des alertes...</div>
        </div>
      </DashboardLayout>
    );
  }

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
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Alertes urgentes ({highPriorityAlerts.length})
                  </CardTitle>
                  <Button
                    onClick={() => handleCreateOrderForAlerts(highPriorityAlerts)}
                    size="sm"
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Commander
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {highPriorityAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 bg-background rounded-lg border border-destructive/20 hover:bg-muted/50 transition-colors">
                      <div 
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        onClick={() => handleCreateOrderForAlerts([alert])}
                      >
                        <Package className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 min-w-0 flex-1">
                          <h4 className="font-medium text-foreground hover:text-primary transition-colors">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{alert.date}</span>
                            <span className="text-xs text-primary">Cliquez pour commander</span>
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-warning flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Stocks faibles ({mediumPriorityAlerts.length})
                  </CardTitle>
                  <Button
                    onClick={() => handleCreateOrderForAlerts(mediumPriorityAlerts)}
                    size="sm"
                    variant="outline"
                    className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Commander
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mediumPriorityAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 bg-background rounded-lg border border-warning/20 hover:bg-muted/50 transition-colors">
                      <div 
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        onClick={() => handleCreateOrderForAlerts([alert])}
                      >
                        <TrendingDown className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 min-w-0 flex-1">
                          <h4 className="font-medium text-foreground hover:text-primary transition-colors">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{alert.date}</span>
                            <span className="text-xs text-primary">Cliquez pour commander</span>
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