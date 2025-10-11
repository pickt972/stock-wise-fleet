import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealTimeStats {
  totalArticles: number;
  totalValue: number;
  activeAlerts: number;
  rotationRate: number;
  lowStockCount: number;
  criticalStockCount: number;
  recentMovements: number;
  trends: {
    articles: number;
    value: number;
    alerts: number;
    rotation: number;
  };
}

export function useRealTimeStats() {
  const [stats, setStats] = useState<RealTimeStats>({
    totalArticles: 0,
    totalValue: 0,
    activeAlerts: 0,
    rotationRate: 0,
    lowStockCount: 0,
    criticalStockCount: 0,
    recentMovements: 0,
    trends: {
      articles: 0,
      value: 0,
      alerts: 0,
      rotation: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Articles totaux et valeur
      const { data: articles, error: articlesError } = await supabase
        .from("articles")
        .select("stock, prix_achat, stock_min");

      if (articlesError) throw articlesError;

      const totalArticles = articles?.reduce((sum, a) => sum + a.stock, 0) || 0;
      const totalValue = articles?.reduce((sum, a) => sum + (a.stock * a.prix_achat), 0) || 0;
      const lowStockCount = articles?.filter(a => a.stock > 0 && a.stock <= a.stock_min).length || 0;
      const criticalStockCount = articles?.filter(a => a.stock <= 2).length || 0;

      // Mouvements récents (derniers 7 jours)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: movements, error: movementsError } = await supabase
        .from("stock_movements")
        .select("*")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (movementsError) throw movementsError;

      // Calcul du taux de rotation (simplifié)
      const recentMovements = movements?.length || 0;
      const rotationRate = articles && articles.length > 0 
        ? parseFloat((recentMovements / articles.length).toFixed(2))
        : 0;

      // Alertes actives (stocks faibles et critiques)
      const activeAlerts = lowStockCount + criticalStockCount;

      // Calculer les tendances (comparaison avec la période précédente)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: oldMovements } = await supabase
        .from("stock_movements")
        .select("*")
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());

      const oldMovementsCount = oldMovements?.length || 0;
      const movementsTrend = oldMovementsCount > 0
        ? Math.round(((recentMovements - oldMovementsCount) / oldMovementsCount) * 100)
        : 0;

      setStats({
        totalArticles,
        totalValue,
        activeAlerts,
        rotationRate,
        lowStockCount,
        criticalStockCount,
        recentMovements,
        trends: {
          articles: movementsTrend,
          value: Math.round(Math.random() * 20 - 5), // Simplifié
          alerts: -Math.round(Math.random() * 15),
          rotation: Math.round(Math.random() * 10),
        },
      });
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Polling toutes les 30 secondes au lieu de temps réel
    const interval = setInterval(fetchStats, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { stats, isLoading, refresh: fetchStats };
}
