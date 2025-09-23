import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Edit, Trash2, AlertTriangle, X, Layers } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useColorPreferences } from "@/hooks/useColorPreferences";

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
  
  // États des filtres
  const [filters, setFilters] = useState({
    categorie: "",
    marque: "",
    stockStatus: "",
    emplacement: "",
  });
  const [currentSort, setCurrentSort] = useState('designation');
  const [currentDirection, setCurrentDirection] = useState<'asc' | 'desc'>('asc');
  
  const { toast } = useToast();
  const { getColorForText } = useColorPreferences();

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

  useEffect(() => {
    fetchArticles();
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
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
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
      // Filtre de recherche textuelle
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
    [...new Set(articles.map(article => article.categorie))].filter(Boolean), 
    [articles]
  );
  const uniqueMarques = useMemo(() => 
    [...new Set(articles.map(article => article.marque))].filter(Boolean), 
    [articles]
  );
  const uniqueEmplacements = useMemo(() => 
    [...new Set([
      ...articles.map(article => article.emplacement),
      ...articles.map(article => article.emplacements?.nom)
    ])].filter(Boolean), 
    [articles]
  );

  const clearFilters = () => {
    setFilters({
      categorie: "",
      marque: "",
      stockStatus: "",
      emplacement: "",
    });
    setSearchTerm("");
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "") || searchTerm !== "";

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
      <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
      
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
        <CreateArticleDialog onArticleCreated={handleArticleCreated} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full lg:w-auto flex-shrink-0">
                <Filter className="mr-2 h-4 w-4" />
                Filtres
                {hasActiveFilters && (
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

      {/* Panneau de filtres */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-categorie">Catégorie</Label>
                <Select 
                  value={filters.categorie} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, categorie: value }))}
                >
                  <SelectTrigger id="filter-categorie">
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les catégories</SelectItem>
                    {uniqueCategories.map((categorie) => (
                      <SelectItem key={categorie} value={categorie}>
                        {categorie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-marque">Marque</Label>
                <Select 
                  value={filters.marque} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, marque: value }))}
                >
                  <SelectTrigger id="filter-marque">
                    <SelectValue placeholder="Toutes les marques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les marques</SelectItem>
                    {uniqueMarques.map((marque) => (
                      <SelectItem key={marque} value={marque}>
                        {marque}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-stock">Statut du stock</Label>
                <Select 
                  value={filters.stockStatus} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, stockStatus: value }))}
                >
                  <SelectTrigger id="filter-stock">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="faible">Stock faible</SelectItem>
                    <SelectItem value="rupture">Rupture de stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-emplacement">Emplacement</Label>
                <Select 
                  value={filters.emplacement} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, emplacement: value }))}
                >
                  <SelectTrigger id="filter-emplacement">
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les emplacements</SelectItem>
                    {uniqueEmplacements.map((emplacement) => (
                      <SelectItem key={emplacement} value={emplacement}>
                        {emplacement}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Scanner d'articles */}
      <ArticleScanner onArticleFound={(article) => {
        // Optionnel: faire quelque chose quand un article est trouvé
        console.log('Article trouvé:', article);
      }} />

      <Card className="w-full max-w-full">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
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
                        <div className="flex items-center gap-1">
                          {principalFournisseur ? (
                            <Badge variant="secondary" className="text-xs">
                              {principalFournisseur}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {hasMultipleFournisseurs && (
                            <Badge variant="outline" className="text-xs">
                              +{article.article_fournisseurs!.length - 1}
                            </Badge>
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
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer l'article "{article.designation}" (Réf: {article.reference}) ?
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteArticle(article.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
      </DashboardLayout>
  );
}