import { useQuery } from "@tanstack/react-query";
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

const buildAlerts = (groups: AggregatedGroup[]): SubcategoryAlert[] =>
  groups.map((g) => {
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
    const faibleCount  = alertArticles.filter((a) => a.type === "faible").length;
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
      priority: g.totalStock === 0 ? ("high" as const) : ("medium" as const),
    };
  });

export const useAlerts = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAggregatedStockGroups({ onlyAlerts: true }),
    staleTime: 1000 * 60 * 2,   // 2 min de cache — évite les requêtes répétées
    refetchOnWindowFocus: false, // pas de rechargement au focus (coûteux sur mobile)
  });

  const subcategoryAlerts = data ? buildAlerts(data) : [];
  const totalRupture = subcategoryAlerts.filter((s) => s.totalStock === 0).length;
  const totalFaible  = subcategoryAlerts.filter((s) => s.totalStock > 0).length;

  return {
    subcategoryAlerts,
    totalRupture,
    totalFaible,
    totalAlerts: subcategoryAlerts.length,
    isLoading,
    refetch,
  };
};
