import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, AlertTriangle, TrendingUp, ShoppingCart, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ArticleListSkeleton } from "@/components/ui/skeletons/ArticleListSkeleton";
import { useNavigate } from "react-router-dom";
import { InventaireSession } from "@/components/inventaire/InventaireSession";
import { InventaireTable } from "@/components/inventaire/InventaireTable";
import { InventaireActions } from "@/components/inventaire/InventaireActions";
import { useToast } from "@/hooks/use-toast";

export default function Inventaire() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeInventaire, setActiveInventaire] = useState<any>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [inventaireStats, setInventaireStats] = useState({ total: 0, counted: 0, remaining: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleOrderArticle = (article: any) => {
    navigate('/commandes', { 
      state: { 
        preSelectedArticle: {
          id: article.id,
          reference: article.reference,
          designation: article.designation,
          prix_achat: article.prix_achat,
          fournisseur_id: article.fournisseur_id
        }
      }
    });
  };

  // Vérifier s'il y a un inventaire en cours
  useEffect(() => {
    checkActiveInventaire();
  }, []);

  const checkActiveInventaire = async () => {
    try {
      const { data, error } = await supabase
        .from('inventaires')
        .select('*')
        .in('statut', ['en_cours', 'cloture'])
        .order('date_creation', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setActiveInventaire(data[0]);
        await updateInventaireStats(data[0].id);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'inventaire actif:', error);
    }
  };

  const updateInventaireStats = async (inventaireId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventaire_items')
        .select('stock_compte')
        .eq('inventaire_id', inventaireId);

      if (error) throw error;

      const total = data.length;
      const counted = data.filter(item => item.stock_compte !== null).length;
      const remaining = total - counted;

      setInventaireStats({ total, counted, remaining });
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    }
  };

  const handleSessionCreated = (inventaireId: string) => {
    setShowNewSession(false);
    checkActiveInventaire();
  };

  const handleItemUpdate = () => {
    if (activeInventaire) {
      updateInventaireStats(activeInventaire.id);
    }
  };

  const handleStatusChange = () => {
    checkActiveInventaire();
  };

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['inventory-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('reference');
      
      if (error) throw error;
      return data;
    },
  });

  const filteredArticles = articles.filter(article =>
    article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.marque.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = articles.reduce((sum, article) => sum + (article.stock * article.prix_achat), 0);
  const totalArticles = articles.length;
  const lowStockCount = articles.filter(article => article.stock <= article.stock_min).length;

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) {
      return { label: "Rupture", variant: "destructive" as const };
    } else if (stock <= stockMin) {
      return { label: "Stock faible", variant: "secondary" as const };
    }
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventaire</h1>
            <p className="text-muted-foreground">
              Gestion des inventaires et vue d'ensemble du stock
            </p>
          </div>
          
          {!activeInventaire && (
            <Button
              onClick={() => setShowNewSession(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvel inventaire
            </Button>
          )}
        </div>

        {/* Session d'inventaire active ou création */}
        {showNewSession && !activeInventaire && (
          <InventaireSession onSessionCreated={handleSessionCreated} />
        )}

        {activeInventaire && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InventaireTable 
                inventaireId={activeInventaire.id}
                onItemUpdate={handleItemUpdate}
              />
            </div>
            <div>
              <InventaireActions
                inventaire={activeInventaire}
                remainingItems={inventaireStats.remaining}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        )}

        {/* Statistiques générales - Affichées seulement s'il n'y a pas d'inventaire actif */}
        {!activeInventaire && !showNewSession && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valeur totale du stock</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalValue.toFixed(2)} €</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total des articles</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalArticles}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Articles en stock faible</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recherche */}
            <Card>
              <CardHeader>
                <CardTitle>Articles en stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <SearchWithScanner
                    placeholder="Scanner ou rechercher un article..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Marque</TableHead>
                        <TableHead>Emplacement</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center">Stock Min</TableHead>
                        <TableHead className="text-center">Prix unitaire</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <ArticleListSkeleton />
                          </TableCell>
                        </TableRow>
                      ) : filteredArticles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            Aucun article trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredArticles.map((article) => {
                          const status = getStockStatus(article.stock, article.stock_min);
                          return (
                            <TableRow key={article.id}>
                              <TableCell className="font-medium">{article.reference}</TableCell>
                              <TableCell>{article.designation}</TableCell>
                              <TableCell>{article.marque}</TableCell>
                              <TableCell>
                                {article.emplacement && (
                                  <Badge variant="outline">{article.emplacement}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{article.stock}</TableCell>
                              <TableCell className="text-center">{article.stock_min}</TableCell>
                              <TableCell className="text-center">{article.prix_achat.toFixed(2)} €</TableCell>
                              <TableCell className="text-center">
                                {status.label === "Stock faible" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOrderArticle(article)}
                                    className="p-0 h-auto"
                                  >
                                    <Badge variant={status.variant} className="cursor-pointer">
                                      {status.label}
                                    </Badge>
                                  </Button>
                                ) : (
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}