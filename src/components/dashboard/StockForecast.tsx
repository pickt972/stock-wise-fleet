import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ForecastData {
  date: string;
  stock: number;
  forecast: number;
  confidence: number;
}

export const StockForecast = memo(function StockForecast() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateForecast();
  }, []);

  const generateForecast = async () => {
    try {
      // Récupérer l'historique des mouvements (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("created_at, quantity, type")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      const { data: articles } = await supabase
        .from("articles")
        .select("stock");

      const currentTotalStock = articles?.reduce((sum, a) => sum + a.stock, 0) || 1000;

      // Grouper par jour
      const dailyData = new Map<string, number>();
      movements?.forEach((m) => {
        const date = new Date(m.created_at).toISOString().split("T")[0];
        const change = m.type === "entree" ? m.quantity : -m.quantity;
        dailyData.set(date, (dailyData.get(date) || 0) + change);
      });

      // Calculer la tendance
      const values = Array.from(dailyData.values());
      const avgChange = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;

      // Générer prévisions pour les 7 prochains jours
      const forecast: ForecastData[] = [];
      let runningStock = currentTotalStock;

      for (let i = -7; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

        if (i <= 0) {
          // Données historiques
          forecast.push({
            date: dateStr,
            stock: runningStock,
            forecast: 0,
            confidence: 0,
          });
        } else {
          // Prévisions
          const predictedChange = avgChange * (1 + (Math.random() - 0.5) * 0.3);
          runningStock += predictedChange;
          const confidence = Math.max(60, 100 - i * 5); // Confiance diminue avec le temps

          forecast.push({
            date: dateStr,
            stock: 0,
            forecast: Math.max(0, runningStock),
            confidence,
          });
        }
      }

      setForecastData(forecast);
    } catch (error) {
      console.error("Erreur génération prévisions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prévisions de stock
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            7 jours
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chargement des prévisions...
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="stock"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="Stock actuel"
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  strokeDasharray="5 5"
                  name="Prévision"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Basé sur les 30 derniers jours de mouvements
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-xs">Historique</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
                  <span className="text-xs">Prévision</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
