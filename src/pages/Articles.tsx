import { useState, useEffect, useMemo } from "react";
import { Edit, Plus, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { EditArticleDialog } from "@/components/articles/EditArticleDialog";
import { ArticleDeleteDialog } from "@/components/articles/ArticleDeleteDialog";
import DashboardLayout from "./DashboardLayout";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  stock_max: number;
  prix_achat: number;
  emplacement: string;
  fournisseur_id?: string;
}

type SortOption = "designation" | "categorie" | "stock" | "prix_achat";

export default function Articles() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("tous");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("designation");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useRoleAccess();

  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque, categorie, stock, stock_min, stock_max, prix_achat, emplacement, fournisseur_id')
        .order('designation');

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('nom')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      const uniqueCategories = [...new Set(data?.map(cat => cat.nom) || [])];
      setCategories(uniqueCategories);
    } catch (error: any) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Rupture", filter: "rupture" };
    if (stock <= stockMin) return { variant: "secondary" as const, label: "Stock bas", filter: "stock-bas" };
    return { variant: "default" as const, label: "OK", filter: "ok" };
  };

  const filteredArticles = useMemo(() => {
    let filtered = articles.filter(article => {
      // Filtre de recherche avec debounce
      const matchesSearch = debouncedSearchTerm === "" || 
        article.designation.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        article.reference.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        article.marque.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      // Filtre par statut stock
      const status = getStockStatus(article.stock, article.stock_min);
      const matchesStockFilter = activeFilter === "tous" || status.filter === activeFilter;

      // Filtre par catégorie
      const matchesCategoryFilter = categoryFilter === "all" || article.categorie === categoryFilter;

      return matchesSearch && matchesStockFilter && matchesCategoryFilter;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "designation":
          return a.designation.localeCompare(b.designation);
        case "categorie":
          return a.categorie.localeCompare(b.categorie);
        case "stock":
          return b.stock - a.stock;
        case "prix_achat":
          return b.prix_achat - a.prix_achat;
        default:
          return 0;
      }
    });

    return filtered;
  }, [articles, debouncedSearchTerm, activeFilter, categoryFilter, sortBy]);

  const stockFilters = [
    { id: "tous", label: "Tous" },
    { id: "stock-bas", label: "Stock bas" },
    { id: "rupture", label: "Rupture" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Gestion des Articles" 
          showBackButton 
          onBack={() => navigate('/dashboard')}
        />
        
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {/* Message informatif pour non-admins */}
          {!isAdmin() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ℹ️ Consultation seule - Contactez un administrateur pour modifier les articles
              </AlertDescription>
            </Alert>
          )}

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-4">
            <SearchWithScanner
              placeholder="Chercher article..."
              value={searchTerm}
              onChange={setSearchTerm}
              onArticleNotFound={() => {}}
              returnTo="/articles"
            />
            
            {isAdmin() && (
              <Button
                size="lg"
                onClick={() => setShowCreateDialog(true)}
                className="flex-shrink-0"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ajouter
              </Button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Filtres stock */}
            <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
              {stockFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className="flex-shrink-0"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Filtre catégorie */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tri */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="designation">Nom</SelectItem>
                <SelectItem value="categorie">Catégorie</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="prix_achat">Prix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des articles */}
          <div className="space-y-2">
            {filteredArticles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucun article trouvé</p>
              </Card>
            ) : (
              filteredArticles.map((article) => {
                const status = getStockStatus(article.stock, article.stock_min);
                return (
                  <Card
                    key={article.id}
                    className="p-4 hover:bg-accent/50 transition-colors border border-border"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/articles/${article.id}`)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground truncate">
                            {article.designation}
                          </h3>
                          <Badge variant={status.variant} className="flex-shrink-0">
                            Qty: {article.stock}
                          </Badge>
                          <Badge variant="outline" className="flex-shrink-0">
                            {article.categorie}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>{article.emplacement || 'Sans emplacement'}</span>
                          <span>Prix: {article.prix_achat.toFixed(2)}€</span>
                          {status.label !== "OK" && (
                            <span className="text-destructive">⚠️ {status.label}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions admin */}
                      {isAdmin() && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingArticle(article)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <ArticleDeleteDialog
                            article={article}
                            onArticleDeleted={fetchArticles}
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground text-center">
            {filteredArticles.length} article(s) affiché(s) sur {articles.length}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateArticleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onArticleCreated={() => {
            fetchArticles();
            setShowCreateDialog(false);
          }}
        />
      )}

      {editingArticle && (
        <EditArticleDialog
          article={editingArticle}
          onArticleUpdated={() => {
            fetchArticles();
            setEditingArticle(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
