import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

export function StockDistribution() {
  const [data, setData] = useState<DistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDistribution();
  }, []);

  const fetchDistribution = async () => {
    try {
      const { data: articles } = await supabase
        .from("articles")
        .select("stock, stock_min");

      if (!articles) return;

      const excellent = articles.filter(a => a.stock > a.stock_min * 2).length;
      const bon = articles.filter(a => a.stock > a.stock_min && a.stock <= a.stock_min * 2).length;
      const faible = articles.filter(a => a.stock > 0 && a.stock <= a.stock_min).length;
      const rupture = articles.filter(a => a.stock === 0).length;

      setData([
        { name: "Excellent", value: excellent, color: "hsl(var(--chart-1))" },
        { name: "Bon", value: bon, color: "hsl(var(--chart-2))" },
        { name: "Faible", value: faible, color: "hsl(var(--chart-3))" },
        { name: "Rupture", value: rupture, color: "hsl(var(--chart-4))" },
      ]);
    } catch (error) {
      console.error("Erreur distribution:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Distribution du stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chargement...
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {data.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-muted-foreground">{item.name}:</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
