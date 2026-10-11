import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, Package, CheckCircle } from "lucide-react";

interface Props {
  sousCategorieNom: string;
  currentArticleId: string;
  currentArticleStock: number;
  currentStockMin: number;
}

export function SubcategoryStockContext({
  sousCategorieNom,
  currentArticleId,
  currentArticleStock,
  currentStockMin,
}: Props) {
  const { data } = useQuery({
    queryKey: ["subcategory-stock-context", sousCategorieNom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, stock, stock_min")
        .eq("sous_categorie", sousCategorieNom)
        .eq("actif", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  if (!data || data.length === 0) return null;

  // Stock total de la sous-catégorie (en utilisant le stock actuel du formulaire pour cet article)
  const totalStock = data.reduce((sum, a) => {
    if (a.id === currentArticleId) return sum + currentArticleStock;
    return sum + a.stock;
  }, 0);

  // Seuil : somme des stock_min de tous les articles de la sous-catégorie
  const totalStockMin = data.reduce((sum, a) => {
    if (a.id === currentArticleId) return sum + currentStockMin;
    return sum + a.stock_min;
  }, 0);

  const isAlert = totalStock <= totalStockMin;
  const isRupture = totalStock === 0;
  const articleCount = data.length;

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 text-sm space-y-1.5 ${
        isRupture
          ? "border-destructive/40 bg-destructive/5"
          : isAlert
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">
        {isRupture ? (
          <Package className="h-3.5 w-3.5 text-destructive" />
        ) : isAlert ? (
          <TrendingDown className="h-3.5 w-3.5 text-warning" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        )}
        Contexte sous-catégorie · {sousCategorieNom}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        <div className="text-center">
          <p className={`text-xl font-bold leading-tight ${isRupture ? "text-destructive" : isAlert ? "text-warning" : "text-foreground"}`}>
            {totalStock}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Stock total</p>
        </div>
        <div className="text-center border-x border-border/50">
          <p className="text-xl font-bold leading-tight text-muted-foreground">{totalStockMin}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Seuil d'alerte</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold leading-tight text-muted-foreground">{articleCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Référence{articleCount > 1 ? "s" : ""}</p>
        </div>
      </div>
      {isRupture && (
        <p className="text-xs text-destructive font-medium">⚠ Rupture totale sur cette sous-catégorie</p>
      )}
      {!isRupture && isAlert && (
        <p className="text-xs text-warning font-medium">⚠ Stock faible sur cette sous-catégorie</p>
      )}
    </div>
  );
}
