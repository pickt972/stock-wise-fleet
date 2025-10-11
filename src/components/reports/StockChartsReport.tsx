import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

export function StockChartsReport() {
  const { data: stockByCategory, isLoading: categoryLoading } = useQuery({
    queryKey: ['stock-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('categorie, stock, prix_achat');
      
      if (error) throw error;

      const categoryMap = new Map<string, { count: number; value: number; stock: number }>();
      
      data?.forEach(article => {
        const current = categoryMap.get(article.categorie) || { count: 0, value: 0, stock: 0 };
        categoryMap.set(article.categorie, {
          count: current.count + 1,
          value: current.value + (article.stock * article.prix_achat),
          stock: current.stock + article.stock
        });
      });

      return Array.from(categoryMap.entries()).map(([name, stats]) => ({
        name,
        articles: stats.count,
        valeur: Math.round(stats.value),
        stock: stats.stock
      }));
    }
  });

  const { data: movementsTrend, isLoading: movementsLoading } = useQuery({
    queryKey: ['movements-trend'],
    queryFn: async () => {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const { data, error } = await supabase
        .from('stock_movements')
        .select('created_at, type, quantity')
        .gte('created_at', last30Days.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Grouper par jour
      const dailyData = new Map<string, { entrees: number; sorties: number }>();
      
      data?.forEach(movement => {
        const date = new Date(movement.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const current = dailyData.get(date) || { entrees: 0, sorties: 0 };
        
        if (movement.type === 'entree') {
          current.entrees += movement.quantity;
        } else {
          current.sorties += movement.quantity;
        }
        
        dailyData.set(date, current);
      });

      return Array.from(dailyData.entries()).map(([date, stats]) => ({
        date,
        entrees: stats.entrees,
        sorties: stats.sorties
      })).slice(-14); // Derniers 14 jours
    }
  });

  const { data: topArticles, isLoading: topLoading } = useQuery({
    queryKey: ['top-articles'],
    queryFn: async () => {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          article_id,
          quantity,
          articles!inner(reference, designation)
        `)
        .gte('created_at', last30Days.toISOString());
      
      if (error) throw error;

      // Compter les mouvements par article
      const articleMap = new Map<string, { name: string; mouvements: number }>();
      
      data?.forEach(movement => {
        const key = movement.article_id;
        const current = articleMap.get(key) || { 
          name: `${movement.articles.reference} - ${movement.articles.designation}`, 
          mouvements: 0 
        };
        current.mouvements += Math.abs(movement.quantity);
        articleMap.set(key, current);
      });

      return Array.from(articleMap.values())
        .sort((a, b) => b.mouvements - a.mouvements)
        .slice(0, 10)
        .map(item => ({
          name: item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
          mouvements: item.mouvements
        }));
    }
  });

  const { data: stockValue, isLoading: valueLoading } = useQuery({
    queryKey: ['stock-value-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('stock, prix_achat, stock_min, stock_max');
      
      if (error) throw error;

      const totalValue = data?.reduce((sum, article) => sum + (article.stock * article.prix_achat), 0) || 0;
      const lowStock = data?.filter(a => a.stock <= a.stock_min).length || 0;
      const normalStock = data?.filter(a => a.stock > a.stock_min && a.stock < a.stock_max).length || 0;
      const highStock = data?.filter(a => a.stock >= a.stock_max).length || 0;

      return [
        { name: 'Stock faible', value: lowStock, color: 'hsl(var(--destructive))' },
        { name: 'Stock normal', value: normalStock, color: 'hsl(var(--success))' },
        { name: 'Stock élevé', value: highStock, color: 'hsl(var(--warning))' }
      ];
    }
  });

  if (categoryLoading || movementsLoading || topLoading || valueLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Graphique des mouvements sur 14 jours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution des Mouvements (14 derniers jours)
          </CardTitle>
          <CardDescription>
            Visualisation des entrées et sorties de stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={movementsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="entrees" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Entrées"
                dot={{ fill: 'hsl(var(--success))' }}
              />
              <Line 
                type="monotone" 
                dataKey="sorties" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Sorties"
                dot={{ fill: 'hsl(var(--destructive))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par catégorie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Répartition par Catégorie
            </CardTitle>
            <CardDescription>
              Valeur du stock par catégorie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stockByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.valeur}€)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="valeur"
                >
                  {stockByCategory?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des niveaux de stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Niveaux de Stock
            </CardTitle>
            <CardDescription>
              Répartition des articles par niveau de stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stockValue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {stockValue?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 articles les plus mouvementés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Articles les Plus Mouvementés
          </CardTitle>
          <CardDescription>
            Articles avec le plus de mouvements sur 30 jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topArticles} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={200}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '11px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="mouvements" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
