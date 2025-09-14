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

  return {
    alerts,
    highPriorityAlerts: getHighPriorityAlerts(),
    mediumPriorityAlerts: getMediumPriorityAlerts(),
    isLoading,
    refetch: fetchAlerts
  };
};