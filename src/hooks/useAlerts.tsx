import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Alert {
  id: string;
  type: "rupture" | "faible";
  title: string;
  description: string;
  priority: "high" | "medium";
  category: string;
  date: string;
  article: {
    id: string;
    designation: string;
    reference: string;
    stock: number;
    stock_min: number;
    categorie: string;
    marque: string;
    prix_achat: number;
  };
}

export interface CategoryAlerts {
  category: string;
  alerts: Alert[];
  totalAlerts: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
}

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .order('stock', { ascending: true });

      if (error) throw error;

      const alertsData: Alert[] = [];
      
      articles?.forEach((article) => {
        if (article.stock === 0) {
          // Stock épuisé - alerte urgente
          alertsData.push({
            id: `rupture-${article.id}`,
            type: "rupture",
            title: article.designation,
            description: `Stock épuisé - 0 unités (Réf: ${article.reference})`,
            priority: "high",
            category: article.categorie,
            date: new Date().toISOString().split('T')[0],
            article: article
          });
        } else if (article.stock <= article.stock_min) {
          // Stock faible - alerte moyenne
          alertsData.push({
            id: `faible-${article.id}`,
            type: "faible",
            title: article.designation,
            description: `Stock faible - ${article.stock} unités restantes (Min: ${article.stock_min})`,
            priority: "medium",
            category: article.categorie,
            date: new Date().toISOString().split('T')[0],
            article: article
          });
        }
      });

      setAlerts(alertsData);
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

  const getHighPriorityAlerts = () => alerts.filter(alert => alert.priority === "high");
  const getMediumPriorityAlerts = () => alerts.filter(alert => alert.priority === "medium");
  
  const getAlertsByCategory = (): CategoryAlerts[] => {
    const categories = [...new Set(alerts.map(alert => alert.category))];
    
    return categories.map(category => {
      const categoryAlerts = alerts.filter(alert => alert.category === category);
      return {
        category,
        alerts: categoryAlerts,
        totalAlerts: categoryAlerts.length,
        highPriorityCount: categoryAlerts.filter(alert => alert.priority === "high").length,
        mediumPriorityCount: categoryAlerts.filter(alert => alert.priority === "medium").length,
      };
    }).sort((a, b) => b.highPriorityCount - a.highPriorityCount || b.totalAlerts - a.totalAlerts);
  };

  return {
    alerts,
    highPriorityAlerts: getHighPriorityAlerts(),
    mediumPriorityAlerts: getMediumPriorityAlerts(),
    alertsByCategory: getAlertsByCategory(),
    isLoading,
    refetch: fetchAlerts
  };
};