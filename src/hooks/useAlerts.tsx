import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ArticleAlert {
  id: string;
  designation: string;
  reference: string;
  stock: number;
  stock_min: number;
  categorie: string;
  marque: string;
  prix_achat: number;
  type: "rupture" | "faible";
}

export interface SubcategoryAlert {
  subcategory: string;
  totalArticles: number;
  ruptureCount: number;
  faibleCount: number;
  alertArticles: ArticleAlert[];
  priority: "high" | "medium";
}

export const useAlerts = () => {
  const [subcategoryAlerts, setSubcategoryAlerts] = useState<SubcategoryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      // Fetch ALL articles to know total per subcategory
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .order('categorie', { ascending: true });

      if (error) throw error;

      // Group by subcategory
      const grouped: Record<string, { total: number; alerts: ArticleAlert[] }> = {};

      articles?.forEach((article) => {
        const cat = article.categorie || "Non classé";
        if (!grouped[cat]) {
          grouped[cat] = { total: 0, alerts: [] };
        }
        grouped[cat].total++;

        if (article.stock === 0) {
          grouped[cat].alerts.push({
            ...article,
            type: "rupture",
          });
        } else if (article.stock <= article.stock_min) {
          grouped[cat].alerts.push({
            ...article,
            type: "faible",
          });
        }
      });

      // Build subcategory alerts (only categories with at least one alert)
      const result: SubcategoryAlert[] = Object.entries(grouped)
        .filter(([, data]) => data.alerts.length > 0)
        .map(([subcategory, data]) => {
          const ruptureCount = data.alerts.filter(a => a.type === "rupture").length;
          const faibleCount = data.alerts.filter(a => a.type === "faible").length;
          return {
            subcategory,
            totalArticles: data.total,
            ruptureCount,
            faibleCount,
            alertArticles: data.alerts,
            priority: ruptureCount > 0 ? "high" as const : "medium" as const,
          };
        })
        .sort((a, b) => b.ruptureCount - a.ruptureCount || b.alertArticles.length - a.alertArticles.length);

      setSubcategoryAlerts(result);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les alertes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const totalRupture = subcategoryAlerts.reduce((sum, s) => sum + s.ruptureCount, 0);
  const totalFaible = subcategoryAlerts.reduce((sum, s) => sum + s.faibleCount, 0);

  return {
    subcategoryAlerts,
    totalRupture,
    totalFaible,
    totalAlerts: totalRupture + totalFaible,
    isLoading,
    refetch: fetchAlerts,
  };
};
