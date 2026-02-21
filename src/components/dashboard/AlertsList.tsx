import { AlertTriangle, Package, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAlerts } from "@/hooks/useAlerts";

export function AlertsList() {
  const navigate = useNavigate();
  const { subcategoryAlerts, isLoading } = useAlerts();

  // Show top 3 subcategories
  const displayAlerts = subcategoryAlerts.slice(0, 3);

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

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertes Stock
          {subcategoryAlerts.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {subcategoryAlerts.length} catégories
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayAlerts.length > 0 ? (
          displayAlerts.map((sub) => {
            const alertCount = sub.ruptureCount + sub.faibleCount;
            const percentage = Math.round((alertCount / sub.totalArticles) * 100);
            return (
              <div 
                key={sub.subcategory} 
                className="flex items-start justify-between p-3 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/alertes')}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {sub.priority === "high" ? (
                      <Package className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-medium text-foreground">{sub.subcategory}</h4>
                    <p className="text-sm text-muted-foreground">
                      {alertCount} / {sub.totalArticles} articles en alerte ({percentage}%)
                    </p>
                    <div className="flex items-center gap-2">
                      {sub.ruptureCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {sub.ruptureCount} rupture{sub.ruptureCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {sub.faibleCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {sub.faibleCount} faible{sub.faibleCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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
          Voir toutes les alertes{subcategoryAlerts.length > 0 && ` (${subcategoryAlerts.length} catégories)`}
        </Button>
      </CardContent>
    </Card>
  );
}
