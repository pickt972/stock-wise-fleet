import { AlertTriangle, Package, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAlerts } from "@/hooks/useAlerts";

export function AlertsList() {
  const navigate = useNavigate();
  const { alerts, isLoading } = useAlerts();

  const handleCreateOrderForAlert = (alert: any) => {
    const articleForOrder = {
      article_id: alert.article.id,
      designation: alert.article.designation,
      reference: alert.article.reference,
      quantite_commandee: alert.type === "rupture" ? Math.max(alert.article.stock_min * 2, 10) : alert.article.stock_min - alert.article.stock + 5,
      prix_unitaire: alert.article.prix_achat,
      total_ligne: 0
    };

    navigate('/commandes', { 
      state: { 
        prefilledItems: [articleForOrder],
        source: 'dashboard-alert'
      } 
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertes Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  // Afficher seulement les 3 premières alertes
  const displayAlerts = alerts.slice(0, 3);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertes Stock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayAlerts.length > 0 ? (
          displayAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between p-3 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div 
                className="flex items-start gap-3 flex-1 cursor-pointer"
                onClick={() => handleCreateOrderForAlert(alert)}
              >
                <div className="mt-0.5">
                  {alert.type === "rupture" ? (
                    <Package className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-medium text-foreground hover:text-primary transition-colors">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {alert.category}
                    </Badge>
                    <span className="text-xs text-primary">Cliquer pour commander</span>
                  </div>
                </div>
              </div>
              <Badge 
                variant={alert.priority === "high" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {alert.priority === "high" ? "Urgent" : "Attention"}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-4">
            Aucune alerte de stock
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => navigate('/alertes')}
        >
          Voir toutes les alertes
        </Button>
      </CardContent>
    </Card>
  );
}