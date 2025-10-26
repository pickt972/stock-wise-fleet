import { useEffect, useState } from "react";
import { AlertTriangle, Package, TrendingDown, ArrowLeft, ShoppingCart, Filter, Grid, List } from "lucide-react";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { AlertsSkeleton } from "@/components/ui/skeletons/AlertsSkeleton";
import { useAlerts, Alert, CategoryAlerts } from "@/hooks/useAlerts";

export default function Alertes() {
  const navigate = useNavigate();
  const { highPriorityAlerts, mediumPriorityAlerts, alertsByCategory, isLoading } = useAlerts();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"overview" | "category">("overview");
  const [filterArticle, setFilterArticle] = useState<string>("");

  useEffect(() => {
    document.title = "Alertes | StockAuto";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Alertes de stock - gérez les ruptures et stocks faibles dans StockAuto.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = "Alertes de stock - gérez les ruptures et stocks faibles dans StockAuto.";
      document.head.appendChild(m);
    }
  }, []);

  const handleCreateOrderForAlerts = (alertsGroup: Alert[]) => {
    // Préparer les articles pour la commande
    const articlesForOrder = alertsGroup.map(alert => ({
      article_id: alert.article.id,
      designation: alert.article.designation,
      reference: alert.article.reference,
      quantite_commandee: alert.type === "rupture" ? Math.max(alert.article.stock_min * 2, 10) : alert.article.stock_min - alert.article.stock + 5,
      prix_unitaire: alert.article.prix_achat,
      total_ligne: 0 // Sera calculé automatiquement
    }));

    // Naviguer vers la page commandes avec les articles pré-remplis
    navigate('/commandes', { 
      state: { 
        prefilledItems: articlesForOrder,
        source: 'alerts'
      } 
    });
  };

  const handleCreateOrderForCategory = (categoryAlerts: CategoryAlerts) => {
    handleCreateOrderForAlerts(categoryAlerts.alerts);
  };

  const filteredCategoriesAlerts = selectedCategory === "all" 
    ? alertsByCategory 
    : alertsByCategory.filter(cat => cat.category === selectedCategory);

  // Filtrer par article
  const filteredHighPriorityAlerts = highPriorityAlerts.filter(alert =>
    filterArticle === "" ||
    alert.article.designation.toLowerCase().includes(filterArticle.toLowerCase()) ||
    alert.article.reference.toLowerCase().includes(filterArticle.toLowerCase())
  );

  const filteredMediumPriorityAlerts = mediumPriorityAlerts.filter(alert =>
    filterArticle === "" ||
    alert.article.designation.toLowerCase().includes(filterArticle.toLowerCase()) ||
    alert.article.reference.toLowerCase().includes(filterArticle.toLowerCase())
  );

  const renderAlertCard = (alert: Alert) => (
    <div key={alert.id} className="flex items-start justify-between p-4 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div 
        className="flex items-start gap-3 flex-1 cursor-pointer"
        onClick={() => handleCreateOrderForAlerts([alert])}
      >
        {alert.type === "rupture" ? (
          <Package className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        ) : (
          <TrendingDown className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
        )}
        <div className="space-y-2 min-w-0 flex-1">
          <h4 className="font-medium text-foreground hover:text-primary transition-colors">{alert.title}</h4>
          <p className="text-sm text-muted-foreground">{alert.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {alert.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{alert.date}</span>
            <span className="text-xs text-primary">Cliquez pour commander</span>
          </div>
        </div>
      </div>
      <Badge 
        variant={alert.priority === "high" ? "destructive" : "secondary"} 
        className="text-xs flex-shrink-0"
      >
        {alert.priority === "high" ? "Urgent" : "Attention"}
      </Badge>
    </div>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <main className="p-4 md:p-6">
          <AlertsSkeleton />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        <header className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </header>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Alertes de stock
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gérez les ruptures de stock et les niveaux critiques par catégorie
          </p>
        </div>

        {/* Recherche par article */}
        <div className="w-full">
          <SearchWithScanner
            placeholder="Filtrer par article..."
            value={filterArticle}
            onChange={setFilterArticle}
            onArticleNotFound={() => {}}
            returnTo="/alertes"
          />
        </div>

        {/* Contrôles de vue */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Vue générale
              </TabsTrigger>
              <TabsTrigger value="category" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Par catégorie
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "category" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrer par catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {alertsByCategory.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.totalAlerts})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsContent value="overview" className="space-y-6">
            {/* Vue générale - comme avant */}
            {/* Alertes urgentes */}
            {filteredHighPriorityAlerts.length > 0 && (
              <section>
                <Card className="border-destructive bg-destructive/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Alertes urgentes ({filteredHighPriorityAlerts.length})
                    </CardTitle>
                    <Button
                      onClick={() => handleCreateOrderForAlerts(highPriorityAlerts)}
                      size="sm"
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander tout
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredHighPriorityAlerts.map(renderAlertCard)}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Alertes d'attention */}
            {filteredMediumPriorityAlerts.length > 0 && (
              <section>
                <Card className="border-warning bg-warning/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-warning flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Stocks faibles ({filteredMediumPriorityAlerts.length})
                    </CardTitle>
                    <Button
                      onClick={() => handleCreateOrderForAlerts(mediumPriorityAlerts)}
                      size="sm"
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Commander tout
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredMediumPriorityAlerts.map(renderAlertCard)}
                  </CardContent>
                </Card>
              </section>
            )}
          </TabsContent>

          <TabsContent value="category" className="space-y-6">
            {/* Vue par catégorie */}
            {filteredCategoriesAlerts.length > 0 ? (
              filteredCategoriesAlerts.map((categoryData) => (
                <section key={categoryData.category}>
                  <Card className={`${
                    categoryData.highPriorityCount > 0 
                      ? "border-destructive bg-destructive/5" 
                      : "border-warning bg-warning/5"
                  }`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className={`flex items-center gap-2 ${
                          categoryData.highPriorityCount > 0 ? "text-destructive" : "text-warning"
                        }`}>
                          <Package className="h-5 w-5" />
                          {categoryData.category}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            {categoryData.totalAlerts} alertes
                          </span>
                          {categoryData.highPriorityCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {categoryData.highPriorityCount} urgent{categoryData.highPriorityCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {categoryData.mediumPriorityCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {categoryData.mediumPriorityCount} attention
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCreateOrderForCategory(categoryData)}
                        size="sm"
                        className={categoryData.highPriorityCount > 0 
                          ? "bg-destructive hover:bg-destructive/90" 
                          : "border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                        }
                        variant={categoryData.highPriorityCount > 0 ? "default" : "outline"}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Commander ({categoryData.totalAlerts})
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryData.alerts.map(renderAlertCard)}
                    </CardContent>
                  </Card>
                </section>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold mb-2">Aucune alerte</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCategory === "all" 
                      ? "Tous vos stocks sont OK!" 
                      : `Aucune alerte pour la catégorie "${selectedCategory}"`
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  );
}