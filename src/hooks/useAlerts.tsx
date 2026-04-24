import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAggregatedStockGroups,
  AggregatedGroup,
} from "@/hooks/useAggregatedStock";

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
  /** Clé unique sous-catégorie + véhicule */
  key: string;
  subcategory: string;
  vehiculeId: string | null;
  vehiculeLabel: string | null;
  totalStock: number;
  stockMin: number;
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
      const groups: AggregatedGroup[] = await fetchAggregatedStockGroups({
        onlyAlerts: true,
      });

      const result: SubcategoryAlert[] = groups.map((g) => {
        const alertArticles: ArticleAlert[] = g.articles.map((a) => ({
          id: a.id,
          designation: a.designation,
          reference: a.reference,
          stock: a.stock,
          stock_min: a.stock_min,
          categorie: a.categorie,
          marque: a.marque,
          prix_achat: a.prix_achat,
          type: a.stock === 0 ? "rupture" : "faible",
        }));
        const ruptureCount = alertArticles.filter((a) => a.type === "rupture").length;
        const faibleCount = alertArticles.filter((a) => a.type === "faible").length;
        const isCritical = g.totalStock === 0;
        return {
          key: g.key,
          subcategory: g.sousCategorie,
          vehiculeId: g.vehiculeId,
          vehiculeLabel: g.vehiculeLabel,
          totalStock: g.totalStock,
          stockMin: g.stockMin,
          totalArticles: g.articles.length,
          ruptureCount,
          faibleCount,
          alertArticles,
          priority: isCritical ? ("high" as const) : ("medium" as const),
        };
      });

      setSubcategoryAlerts(result);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
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

  const totalRupture = subcategoryAlerts.filter((s) => s.totalStock === 0).length;
  const totalFaible = subcategoryAlerts.filter((s) => s.totalStock > 0).length;

  return {
    subcategoryAlerts,
    totalRupture,
    totalFaible,
    totalAlerts: subcategoryAlerts.length,
    isLoading,
    refetch: fetchAlerts,
  };
};
