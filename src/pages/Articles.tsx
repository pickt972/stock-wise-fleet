import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Filter, Edit, Trash2, AlertTriangle, X, Layers, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CompactSortControls } from "@/components/ui/compact-sort-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardLayout from "./DashboardLayout";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { EditArticleDialog } from "@/components/articles/EditArticleDialog";
import { ArticleScanner } from "@/components/scanner/ArticleScanner";
import { ArticleFournisseursManagement } from "@/components/articles/ArticleFournisseursManagement";
import { TransfertEmplacementDialog } from "@/components/transferts/TransfertEmplacementDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import { useRoleAccess } from "@/hooks/useRoleAccess";

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
  emplacement_id?: string;
  created_at: string;
  updated_at: string;
  fournisseur_id?: string;
  fournisseurs?: {
    id: string;
    nom: string;
  };
  emplacements?: {
    id: string;
    nom: string;
    description?: string;
  };
  article_fournisseurs?: Array<{
    id: string;
    fournisseur_id: string;
    est_principal: boolean;
    prix_fournisseur?: number;
    actif: boolean;
    fournisseurs: {
      id: string;
      nom: string;
    };
  }>;
}

export default function Articles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [selectedArticleForEdit, setSelectedArticleForEdit] = useState<Article | null>(null);
  const [selectedArticleForFournisseurs, setSelectedArticleForFournisseurs] = useState<Article | null>(null);
  const [selectedArticleForOrder, setSelectedArticleForOrder] = useState<Article | null>(null);
  const [selectedArticleForTransfert, setSelectedArticleForTransfert] = useState<Article | null>(null);
  const [showFournisseurDialog, setShowFournisseurDialog] = useState(false);
  const [showTransfertDialog, setShowTransfertDialog] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<Array<{ id: string; nom: string }>>([]);
  const [selectedFournisseurForOrder, setSelectedFournisseurForOrder] = useState<string>("");
  
  // États des filtres
  const [filters, setFilters] = useState({
    categorie: "",
    marque: "",
    stockStatus: "",
    emplacement: "",
  });
  const [currentSort, setCurrentSort] = useState('designation');
  const [currentDirection, setCurrentDirection] = useState<'asc' | 'desc'>('asc');
  const ALL_VALUE = "__all__" as const;
  
  const { toast } = useToast();
  const { getColorForText } = useColorPreferences();
  const { hasAnyRole } = useRoleAccess();
  const navigate = useNavigate();

  const canModifyArticles = hasAnyRole(['admin', 'chef_agence']);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          fournisseurs (
            id,
            nom
          ),
          emplacements (
            id,
            nom,
            description
          ),
          article_fournisseurs (
            id,
            fournisseur_id,
            est_principal,
            prix_fournisseur,
            actif,
            fournisseurs (
              id,
              nom
            )
          )
        `)
        .order('created_at', { ascending: false });

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

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchFournisseurs();
  }, []);


  // Recharger les articles quand la page devient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchArticles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleArticleCreated = () => {
    fetchArticles();
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      // Supprimer d'abord les dépendances
      await supabase.from('article_fournisseurs').delete().eq('article_id', articleId);
      await supabase.from('article_vehicules').delete().eq('article_id', articleId);
      
      // Supprimer l'article
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article supprimé avec succès",
      });
      
      fetchArticles();
    } catch (error: any) {
      console.error('Erreur de suppression:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'article. Il est peut-être référencé dans des commandes ou mouvements de stock.",
        variant: "destructive",
      });
    } finally {
      setDeletingArticleId(null);
    }
  };

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Rupture" };
    if (stock <= stockMin) return { variant: "secondary" as const, label: "Faible" };
    return { variant: "default" as const, label: "OK" };
  };

  const getPrincipalFournisseur = (article: Article) => {
    if (article.article_fournisseurs) {
      const active = article.article_fournisseurs.filter(af => af.actif);
      const principal = active.find(af => af.est_principal);
      return principal?.fournisseurs.nom || active[0]?.fournisseurs.nom;
    }
    return article.fournisseurs?.nom;
  };

  const getAllActiveFournisseurs = (article: Article) => {
    if (article.article_fournisseurs && article.article_fournisseurs.length > 0) {
      return article.article_fournisseurs
        .filter(af => af.actif && af.fournisseurs)
        .map(af => af.fournisseurs.nom);
    }
    return article.fournisseurs ? [article.fournisseurs.nom] : [];
  };

  const getPrincipalPrice = (article: Article) => {
    if (article.article_fournisseurs) {
      const active = article.article_fournisseurs.filter(af => af.actif);
      const principal = active.find(af => af.est_principal);
      return principal?.prix_fournisseur ?? active[0]?.prix_fournisseur ?? article.prix_achat;
    }
    return article.prix_achat;
  };

  const sortOptions = [
    { value: 'designation', label: 'Désignation' },
    { value: 'reference', label: 'Référence' },
    { value: 'marque', label: 'Marque' },
    { value: 'categorie', label: 'Catégorie' },
    { value: 'stock', label: 'Stock' },
    { value: 'prix_achat', label: 'Prix' },
    { value: 'created_at', label: 'Date de création' },
    { value: 'emplacement', label: 'Emplacement' }
  ];

  const applySorting = useMemo(() => {
    return (data: Article[]) => {
      return [...data].sort((a, b) => {
        let aValue = a[currentSort as keyof Article];
        let bValue = b[currentSort as keyof Article];

        // Gestion des valeurs numériques
        if (currentSort === 'stock' || currentSort === 'prix_achat') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        if (aValue === bValue) return 0;
        const result = aValue < bValue ? -1 : 1;
        return currentDirection === 'asc' ? result : -result;
      });
    };
  }, [currentSort, currentDirection]);

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setCurrentSort(field);
    setCurrentDirection(direction);
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Filtre de recherche textuelle instantanée
      const matchesSearch = searchTerm === "" || 
        article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.marque.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtres avancés
      const matchesCategorie = filters.categorie === "" || article.categorie === filters.categorie;
      const matchesMarque = filters.marque === "" || article.marque === filters.marque;
      const matchesEmplacement = filters.emplacement === "" || 
        article.emplacement === filters.emplacement || 
        article.emplacements?.nom === filters.emplacement;
      
      const stockStatus = getStockStatus(article.stock, article.stock_min);
      let matchesStockStatus = true;
      if (filters.stockStatus !== "") {
        if (filters.stockStatus === "rupture") {
          matchesStockStatus = stockStatus.label === "Rupture";
        } else if (filters.stockStatus === "faible") {
          matchesStockStatus = stockStatus.label === "Faible";
        } else if (filters.stockStatus === "ok") {
          matchesStockStatus = stockStatus.label === "OK";
        }
      }

      return matchesSearch && matchesCategorie && matchesMarque && matchesEmplacement && matchesStockStatus;
    });
  }, [articles, searchTerm, filters]);

  const sortedArticles = useMemo(() => {
    return applySorting(filteredArticles);
  }, [filteredArticles, applySorting]);

  // Obtenir les valeurs uniques pour les filtres
  const uniqueCategories = useMemo(() => 
    [...new Set(articles.map(article => article.categorie))]
      .filter(cat => cat && typeof cat === 'string' && cat.trim() !== ''), 
    [articles]
  );
  
  const uniqueMarques = useMemo(() => 
    [...new Set(articles.map(article => article.marque))]
      .filter(marque => marque && typeof marque === 'string' && marque.trim() !== ''), 
    [articles]
  );
  
  const uniqueEmplacements = useMemo(() => {
    const emplacements = articles.flatMap(article => {
      const emps = [];
      if (article.emplacement && typeof article.emplacement === 'string' && article.emplacement.trim() !== '') {
        emps.push(article.emplacement);
      }
      if (article.emplacements?.nom && typeof article.emplacements.nom === 'string' && article.emplacements.nom.trim() !== '') {
        emps.push(article.emplacements.nom);
      }
      return emps;
    });
    return [...new Set(emplacements)];
  }, [articles]);

  const clearFilters = useCallback(() => {
    setFilters({
      categorie: "",
      marque: "",
      stockStatus: "",
      emplacement: "",
    });
    setSearchTerm("");
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => value !== "") || searchTerm !== "";

  const handleOrderArticle = (article: Article) => {
    const principalFournisseur = getPrincipalFournisseur(article);
    const principalPrice = getPrincipalPrice(article);
    
    if (!principalFournisseur) {
      // Ouvrir le dialog pour sélectionner un fournisseur
      setSelectedArticleForOrder(article);
      setShowFournisseurDialog(true);
      return;
    }

    // Naviguer vers la page commandes avec les données pré-remplies
    navigate('/commandes', {
      state: {
        prefilledItems: [{
          article_id: article.id,
          reference: article.reference,
          designation: article.designation,
          quantite: Math.max(article.stock_max - article.stock, 1),
          prix_unitaire: principalPrice,
        }],
        fournisseur: principalFournisseur,
      }
    });
  };

  const handleConfirmOrderWithFournisseur = () => {
    if (!selectedArticleForOrder || !selectedFournisseurForOrder) return;

    const selectedFournisseur = fournisseurs.find(f => f.id === selectedFournisseurForOrder);
    if (!selectedFournisseur) return;

    const principalPrice = getPrincipalPrice(selectedArticleForOrder);

    navigate('/commandes', {
      state: {
        prefilledItems: [{
          article_id: selectedArticleForOrder.id,
          reference: selectedArticleForOrder.reference,
          designation: selectedArticleForOrder.designation,
          quantite: Math.max(selectedArticleForOrder.stock_max - selectedArticleForOrder.stock, 1),
          prix_unitaire: principalPrice,
        }],
        fournisseur: selectedFournisseur.nom,
      }
    });

    setShowFournisseurDialog(false);
    setSelectedArticleForOrder(null);
    setSelectedFournisseurForOrder("");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement des articles...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full overflow-x-hidden">
      
      <div className="flex items-center justify-between">
        <CompactSortControls
          sortOptions={sortOptions}
          currentSort={currentSort}
          currentDirection={currentDirection}
          onSortChange={handleSortChange}
          showDragHandle={false}
        />
      </div>
      
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Articles</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gérez votre inventaire d'articles</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransfertEmplacementDialog onTransfertCompleted={fetchArticles} />
          <CreateArticleDialog onArticleCreated={handleArticleCreated} />
        </div>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Tapez pour filtrer les articles en temps réel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 w-full text-base border-2 border-primary/30 focus:border-primary"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full lg:w-auto flex-shrink-0">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres avancés
                  {Object.values(filters).some(value => value !== "") && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      !
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            
            {hasActiveFilters && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Effacer
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Effacer tous les filtres</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {searchTerm && (
          <div className="mt-2 text-sm text-muted-foreground">
            {sortedArticles.length} article{sortedArticles.length > 1 ? 's' : ''} trouvé{sortedArticles.length > 1 ? 's' : ''}
          </div>
        )}
      </Card>

      {/* Panneau de filtres */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-categorie">Catégorie</Label>
                <Select 
                  value={filters.categorie || ALL_VALUE} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, categorie: value === ALL_VALUE ? "" : value }))}
                >
                  <SelectTrigger id="filter-categorie">
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Toutes les catégories</SelectItem>
                    {uniqueCategories.map((categorie) => {
                      if (typeof categorie !== 'string' || categorie.trim() === '') return null;
                      const val = categorie.trim();
                      return (
                        <SelectItem key={`cat-${val}`} value={val}>
                          {val}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-marque">Marque</Label>
                <Select 
                  value={filters.marque || ALL_VALUE} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, marque: value === ALL_VALUE ? "" : value }))}
                >
                  <SelectTrigger id="filter-marque">
                    <SelectValue placeholder="Toutes les marques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Toutes les marques</SelectItem>
                    {uniqueMarques.map((marque) => {
                      if (typeof marque !== 'string' || marque.trim() === '') return null;
                      const val = marque.trim();
                      return (
                        <SelectItem key={`marque-${val}`} value={val}>
                          {val}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-stock">Statut du stock</Label>
                <Select 
                  value={filters.stockStatus || ALL_VALUE} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, stockStatus: value === ALL_VALUE ? "" : value }))}
                >
                  <SelectTrigger id="filter-stock">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tous les statuts</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="faible">Stock faible</SelectItem>
                    <SelectItem value="rupture">Rupture de stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-emplacement">Emplacement</Label>
                <Select 
                  value={filters.emplacement || ALL_VALUE} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, emplacement: value === ALL_VALUE ? "" : value }))}
                >
                  <SelectTrigger id="filter-emplacement">
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tous les emplacements</SelectItem>
                    {uniqueEmplacements.map((emplacement) => {
                      if (typeof emplacement !== 'string' || emplacement.trim() === '') return null;
                      const val = emplacement.trim();
                      return (
                        <SelectItem key={`emp-${val}`} value={val}>
                          {val}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Scanner d'articles */}
      <ArticleScanner onArticleFound={(article) => {
        setSearchTerm(article.designation);
      }} />

      {/* Vue mobile en cartes */}
      <div className="md:hidden space-y-3">
        {sortedArticles.length > 0 ? (
          sortedArticles.map((article) => {
            const stockStatus = getStockStatus(article.stock, article.stock_min);
            const principalFournisseur = getPrincipalFournisseur(article);
            const principalPrice = getPrincipalPrice(article);
            
            return (
              <Card key={article.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{article.designation}</div>
                      <div className="text-xs text-muted-foreground">Réf: {article.reference}</div>
                      <div className="text-xs text-muted-foreground">{article.marque}</div>
                    </div>
                    <Badge variant={stockStatus.variant} className="text-xs flex-shrink-0">
                      {stockStatus.label}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-xs ${getColorForText(article.categorie, 'category')}`}>
                      {article.categorie}
                    </Badge>
                    {getAllActiveFournisseurs(article).map((fournisseur, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-secondary/80">
                        {fournisseur}
                      </Badge>
                    ))}
                    <Badge variant="outline" className={`text-xs ${getColorForText(article.emplacements?.nom || article.emplacement || "Non défini", 'location')}`}>
                      📍 {article.emplacements?.nom || article.emplacement || "Non défini"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Stock</div>
                        <div className="font-semibold flex items-center gap-1">
                          {article.stock}
                          {article.stock <= article.stock_min && (
                            <AlertTriangle className="h-3 w-3 text-warning" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Prix</div>
                        <div className="font-semibold">€{Number(principalPrice ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0"
                        onClick={() => handleOrderArticle(article)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0"
                        onClick={() => {
                          setSelectedArticleForTransfert(article);
                          setShowTransfertDialog(true);
                        }}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 w-9 p-0"
                            onClick={() => setSelectedArticleForFournisseurs(article)}
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-4">
                          <DialogHeader>
                            <DialogTitle className="text-base">Gestion des fournisseurs</DialogTitle>
                          </DialogHeader>
                          {selectedArticleForFournisseurs && (
                            <ArticleFournisseursManagement
                              articleId={selectedArticleForFournisseurs.id}
                              articleNom={selectedArticleForFournisseurs.designation}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {canModifyArticles && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 p-0" 
                          onClick={() => setSelectedArticleForEdit(article)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canModifyArticles && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[90vw] max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base">Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Êtes-vous sûr de vouloir supprimer l'article "{article.designation}" (Réf: {article.reference}) ?
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteArticle(article.id)}
                                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? "Aucun article ne correspond aux filtres sélectionnés" : "Aucun article disponible"}
            </p>
          </Card>
        )}
      </div>

      {/* Vue desktop en tableau */}
      <Card className="w-full hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 sm:w-28">Référence</TableHead>
                  <TableHead className="w-32 sm:w-40">Désignation</TableHead>
                  <TableHead className="hidden md:table-cell w-24 sm:w-28">Marque</TableHead>
                  <TableHead className="hidden lg:table-cell w-28">Catégorie</TableHead>
                  <TableHead className="hidden xl:table-cell w-28">Fournisseur</TableHead>
                  <TableHead className="w-16 sm:w-20">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell w-20 sm:w-24">Statut</TableHead>
                  <TableHead className="hidden lg:table-cell w-20 sm:w-24">Prix (€)</TableHead>
                  <TableHead className="hidden md:table-cell w-24 sm:w-28">Emplacement</TableHead>
                  <TableHead className="w-16 sm:w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {sortedArticles.length > 0 ? (
                sortedArticles.map((article) => {
                  const stockStatus = getStockStatus(article.stock, article.stock_min);
                  const principalFournisseur = getPrincipalFournisseur(article);
                  const principalPrice = getPrincipalPrice(article);
                  const activeCount = article.article_fournisseurs ? article.article_fournisseurs.filter(af => af.actif).length : 0;
                  const hasMultipleFournisseurs = activeCount > 1;
                  
                  return (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium text-xs md:text-sm">{article.reference}</TableCell>
                      <TableCell className="text-xs md:text-sm">
                        <div>
                          <div className="font-medium">{article.designation}</div>
                          <div className="text-xs text-muted-foreground md:hidden">{article.marque}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{article.marque}</TableCell>
                       <TableCell className="hidden lg:table-cell">
                         <Badge 
                           variant="outline" 
                           className={`text-xs ${getColorForText(article.categorie, 'category')}`}
                         >
                           {article.categorie}
                         </Badge>
                       </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">
                        <div className="flex flex-wrap items-center gap-1">
                          {getAllActiveFournisseurs(article).length > 0 ? (
                            getAllActiveFournisseurs(article).map((fournisseur, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-secondary/80">
                                {fournisseur}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-1">
                           <span className="font-medium text-sm">{article.stock}</span>
                           {article.stock <= article.stock_min && (
                             <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-warning cursor-help" />
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>Stock faible (≤ {article.stock_min})</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                           )}
                         </div>
                      </TableCell>
                       <TableCell className="hidden sm:table-cell">
                         <Badge variant={stockStatus.variant} className="text-xs">
                           {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">€{Number(principalPrice ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">📍</span>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getColorForText(article.emplacements?.nom || article.emplacement || "Non défini", 'location')}`}
                            >
                              {article.emplacements?.nom || article.emplacement || "Non défini"}
                            </Badge>
                          </div>
                        </TableCell>
                      <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleOrderArticle(article)}
                                    aria-label="Commander l'article"
                                  >
                                    <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Commander l'article</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedArticleForTransfert(article);
                                      setShowTransfertDialog(true);
                                    }}
                                    aria-label="Transférer l'article"
                                  >
                                    <ArrowLeftRight className="h-3 w-3 md:h-4 md:w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Transférer l'article</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Dialog>
                             <DialogTrigger asChild>
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button 
                                       variant="ghost" 
                                       size="sm" 
                                       className="h-8 w-8 p-0"
                                       onClick={() => setSelectedArticleForFournisseurs(article)}
                                     >
                                       <Layers className="h-3 w-3 md:h-4 md:w-4" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Gérer les fournisseurs</p>
                                   </TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                             </DialogTrigger>
                            <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                              <DialogHeader>
                                <DialogTitle>Gestion des fournisseurs</DialogTitle>
                              </DialogHeader>
                              {selectedArticleForFournisseurs && (
                                <ArticleFournisseursManagement
                                  articleId={selectedArticleForFournisseurs.id}
                                  articleNom={selectedArticleForFournisseurs.designation}
                                />
                              )}
                            </DialogContent>
                           </Dialog>
                            {canModifyArticles && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0" 
                                      onClick={() => setSelectedArticleForEdit(article)}
                                      aria-label="Modifier l'article"
                                    >
                                      <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Modifier l'article</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canModifyArticles && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Supprimer l'article</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[90vw] max-w-md">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer l'article "{article.designation}" (Réf: {article.reference}) ?
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteArticle(article.id)}
                                      className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "Aucun article ne correspond aux filtres sélectionnés" : "Aucun article disponible"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Single EditArticleDialog for all articles */}
      {selectedArticleForEdit && (
        <EditArticleDialog 
          article={selectedArticleForEdit} 
          onArticleUpdated={() => {
            fetchArticles();
            setSelectedArticleForEdit(null);
          }} 
        />
      )}

      {/* Dialog de transfert d'article */}
      {selectedArticleForTransfert && showTransfertDialog && (
        <TransfertEmplacementDialog 
          key={selectedArticleForTransfert.id}
          onTransfertCompleted={() => {
            fetchArticles();
            setShowTransfertDialog(false);
            setSelectedArticleForTransfert(null);
          }}
          preselectedArticleId={selectedArticleForTransfert.id}
        />
      )}

      {/* Dialog de sélection de fournisseur pour commander */}
      <Dialog open={showFournisseurDialog} onOpenChange={setShowFournisseurDialog}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Sélectionner un fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedArticleForOrder && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Article: {selectedArticleForOrder.designation}</p>
                <p>Référence: {selectedArticleForOrder.reference}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fournisseur-select">Fournisseur</Label>
              <Select 
                value={selectedFournisseurForOrder} 
                onValueChange={setSelectedFournisseurForOrder}
              >
                <SelectTrigger id="fournisseur-select">
                  <SelectValue placeholder="Choisir un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map((fournisseur) => (
                    <SelectItem key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFournisseurDialog(false);
                setSelectedArticleForOrder(null);
                setSelectedFournisseurForOrder("");
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmOrderWithFournisseur}
              disabled={!selectedFournisseurForOrder}
            >
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </DashboardLayout>
  );
}