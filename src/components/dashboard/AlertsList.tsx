import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const alerts = [
  {
    id: 1,
    type: "rupture",
    title: "Huile moteur 5W30",
    description: "Stock épuisé - 0 unités",
    priority: "high",
    category: "Consommables"
  },
  {
    id: 2,
    type: "faible",
    title: "Plaquettes de frein avant",
    description: "Stock faible - 2 unités restantes",
    priority: "medium",
    category: "Freinage"
  },
  {
    id: 3,
    type: "faible",
    title: "Batterie 12V 60Ah",
    description: "Stock faible - 3 unités restantes",
    priority: "medium",
    category: "Électrique"
  }
];

export function AlertsList() {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertes Stock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start justify-between p-3 bg-background rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.type === "rupture" ? (
                  <Package className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-warning" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">{alert.title}</h4>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
                <Badge variant="outline" className="text-xs">
                  {alert.category}
                </Badge>
              </div>
            </div>
            <Badge 
              variant={alert.priority === "high" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {alert.priority === "high" ? "Urgent" : "Attention"}
            </Badge>
          </div>
        ))}
        
        <Button variant="outline" className="w-full">
          Voir toutes les alertes
        </Button>
      </CardContent>
    </Card>
  );
}