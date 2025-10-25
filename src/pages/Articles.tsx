import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  emplacement: string;
}

export default function Articles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("tous");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque, categorie, stock, stock_min, emplacement')
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

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Rupture", filter: "rupture" };
    if (stock <= stockMin) return { variant: "secondary" as const, label: "Stock bas", filter: "stock-bas" };
    return { variant: "default" as const, label: "OK", filter: "ok" };
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Filtre de recherche
      const matchesSearch = searchTerm === "" || 
        article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.marque.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtre par statut stock
      if (activeFilter === "tous") return matchesSearch;
      
      const status = getStockStatus(article.stock, article.stock_min);
      return matchesSearch && status.filter === activeFilter;
    });
  }, [articles, searchTerm, activeFilter]);

  const filters = [
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
        <PageHeader title="Stocks" showBackButton onBack={() => navigate('/dashboard')} />
        
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Chercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 pr-10 text-base border-2"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filtres rapides */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
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
                    className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border border-border"
                    onClick={() => navigate(`/articles/${article.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {article.designation}
                          </h3>
                          <Badge variant={status.variant} className="flex-shrink-0">
                            Qty: {article.stock}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {article.emplacement || 'Sans emplacement'}
                          {status.label !== "OK" && (
                            <span className="ml-2">⚠️ {status.label}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
