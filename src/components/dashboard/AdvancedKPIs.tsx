import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, Activity } from "lucide-react";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";

export function AdvancedKPIs() {
  const { stats, isLoading } = useRealTimeStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPIs Avancés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Chargement des métriques...
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      label: "Taux de rotation",
      value: stats.rotationRate,
      target: 3.0,
      unit: "x/semaine",
      icon: Activity,
      trend: stats.trends.rotation,
      color: "text-blue-500",
    },
    {
      label: "Taux de rupture",
      value: ((stats.criticalStockCount / (stats.totalArticles || 1)) * 100).toFixed(1),
      target: 5,
      unit: "%",
      icon: AlertTriangle,
      trend: stats.trends.alerts,
      color: "text-orange-500",
      inverted: true,
    },
    {
      label: "Valeur moyenne/article",
      value: (stats.totalValue / (stats.totalArticles || 1)).toFixed(2),
      target: 50,
      unit: "€",
      icon: DollarSign,
      trend: stats.trends.value,
      color: "text-green-500",
    },
    {
      label: "Activité hebdomadaire",
      value: stats.recentMovements,
      target: 100,
      unit: "mvts",
      icon: Package,
      trend: stats.trends.articles,
      color: "text-purple-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPIs Avancés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const progress = Math.min(100, (parseFloat(kpi.value.toString()) / kpi.target) * 100);
          const isGood = kpi.inverted ? progress < 50 : progress > 70;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-sm font-medium">{kpi.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    {kpi.value} {kpi.unit}
                  </span>
                  <Badge variant={kpi.trend >= 0 ? "default" : "destructive"} className="text-xs">
                    {kpi.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(kpi.trend)}%
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 {kpi.unit}</span>
                  <span className={isGood ? "text-green-500" : "text-orange-500"}>
                    Objectif: {kpi.target} {kpi.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
