import { useEffect, useState } from "react";
import { AlertTriangle, Package, TrendingDown, ArrowLeft, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { AlertsSkeleton } from "@/components/ui/skeletons/AlertsSkeleton";
import { useAlerts, SubcategoryAlert } from "@/hooks/useAlerts";

export default function Alertes() {
  const navigate = useNavigate();
  const { subcategoryAlerts, totalRupture, totalFaible, isLoading } = useAlerts();
  const [filterArticle, setFilterArticle] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Alertes Stock | StockAuto";
  }, []);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleCreateOrderForSubcategory = (sub: SubcategoryAlert) => {
    const articlesForOrder = sub.alertArticles.map(article => ({
      article_id: article.id,
      designation: article.designation,
      reference: article.reference,
      quantite_commandee: article.type === "rupture" 
        ? Math.max(article.stock_min * 2, 10) 
        : article.stock_min - article.stock + 5,
      prix_unitaire: article.prix_achat,
      total_ligne: 0,
    }));

    navigate('/commandes', { 
      state: { prefilledItems: articlesForOrder, source: 'alerts' } 
    });
  };

  // Filter
  const filtered = filterArticle
    ? subcategoryAlerts
        .map(sub => ({
          ...sub,
          alertArticles: sub.alertArticles.filter(a =>
            a.designation.toLowerCase().includes(filterArticle.toLowerCase()) ||
            a.reference.toLowerCase().includes(filterArticle.toLowerCase())
          ),
        }))
        .filter(sub => sub.alertArticles.length > 0)
    : subcategoryAlerts;

  // Sort rupture-first inside each subcategory list
  const sorted = [...filtered].sort((a, b) => {
    const aRupture = a.alertArticles.filter(x => x.type === "rupture").length;
    const bRupture = b.alertArticles.filter(x => x.type === "rupture").length;
    return bRupture - aRupture;
  });

  const highPriority = sorted.filter(s => s.priority === "high");
  const mediumPriority = sorted.filter(s => s.priority === "medium");

  if (isLoading) {
    return (
      <DashboardLayout>
        <main className="p-4 md:p-6">
          <AlertsSkeleton />
        </main>
      </DashboardLayout>
    );
  }

  const renderSubcategoryCard = (sub: SubcategoryAlert) => {
    const isExpanded = expandedCategories.has(sub.key);
    const hasRuptures = sub.alertArticles.some(a => a.type === "rupture");

    return (
      <Card 
        key={sub.key} 
        className={`border ${sub.priority === "high" ? "border-destructive/40" : "border-warning/40"}`}
      >
        <CardHeader 
          className="cursor-pointer pb-3" 
          onClick={() => toggleCategory(sub.key)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {sub.priority === "high" ? (
                <Package className="h-5 w-5 text-destructive flex-shrink-0" />
              ) : (
                <TrendingDown className="h-5 w-5 text-warning flex-shrink-0" />
              )}
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {sub.subcategory}
                  {sub.vehiculeLabel && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">· {sub.vehiculeLabel}</span>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {sub.ruptureCount > 0 && (
                    <span className="font-semibold text-destructive">{sub.ruptureCount} rupture{sub.ruptureCount > 1 ? 's' : ''}</span>
                  )}
                  {sub.ruptureCount > 0 && sub.faibleCount > 0 && (
                    <span className="mx-1.5 text-muted-foreground/60">·</span>
                  )}
                  {sub.faibleCount > 0 && (
                    <span className="font-semibold text-warning">{sub.faibleCount} faible{sub.faibleCount > 1 ? 's' : ''}</span>
                  )}
                  {" "}· {sub.totalArticles} référence{sub.totalArticles > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasRuptures && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateOrderForSubcategory(sub);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Commander
                </Button>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-3">
            {sub.alertArticles.map(article => {
              const isRupture = article.type === "rupture";
              return (
                <div 
                  key={article.id} 
                  className={`flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm border-l-4 ${
                    isRupture ? "border-l-destructive" : "border-l-warning"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isRupture ? (
                      <Package className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-warning flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{article.designation}</p>
                      <p className="text-xs text-muted-foreground">
                        Réf: {article.reference} — Stock: {article.stock} / Min: {article.stock_min}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={isRupture ? "destructive" : "secondary"} 
                    className={`text-xs flex-shrink-0 ml-2 ${!isRupture ? "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" : ""}`}
                  >
                    {isRupture ? "RUPTURE" : "FAIBLE"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <main className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-0.5 -ml-1 text-primary text-[15px] font-medium active:opacity-60 transition-opacity mb-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </button>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-warning" />
            Alertes
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Agrégées par sous-catégorie · {totalRupture} ruptures, {totalFaible} stocks faibles
          </p>
        </div>

        <SearchWithScanner
          placeholder="Filtrer par article..."
          value={filterArticle}
          onChange={setFilterArticle}
          onArticleNotFound={() => {}}
          returnTo="/alertes"
        />

        {/* Ruptures */}
        {highPriority.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
              <Package className="h-5 w-5" />
              Catégories avec ruptures ({highPriority.length})
            </h2>
            {highPriority.map(renderSubcategoryCard)}
          </section>
        )}

        {/* Stocks faibles */}
        {mediumPriority.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-warning flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Catégories avec stocks faibles ({mediumPriority.length})
            </h2>
            {mediumPriority.map(renderSubcategoryCard)}
          </section>
        )}

        {sorted.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">Aucune alerte</h3>
              <p className="text-sm text-muted-foreground">Tous vos stocks sont OK!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </DashboardLayout>
  );
}
