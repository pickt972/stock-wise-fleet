import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Package, TrendingUp, TrendingDown, FileText, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FilterType = "all" | "entree" | "sortie" | "commande";

export function ArticleHistoryReport() {
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Récupérer la liste des articles
  const { data: articles = [] } = useQuery({
    queryKey: ['articles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque')
        .order('reference');
      
      if (error) throw error;
      return data;
    }
  });

  // Récupérer l'article sélectionné
  const { data: selectedArticle } = useQuery({
    queryKey: ['selected-article', selectedArticleId],
    queryFn: async () => {
      if (!selectedArticleId) return null;
      
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', selectedArticleId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArticleId
  });

  // Récupérer les mouvements de stock
  const { data: movements = [] } = useQuery({
    queryKey: ['article-movements', selectedArticleId],
    queryFn: async () => {
      if (!selectedArticleId) return [];
      
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('article_id', selectedArticleId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArticleId
  });

  // Récupérer les commandes
  const { data: commandeItems = [] } = useQuery({
    queryKey: ['article-commandes', selectedArticleId],
    queryFn: async () => {
      if (!selectedArticleId) return [];
      
      const { data, error } = await supabase
        .from('commande_items')
        .select(`
          *,
          commandes!inner(
            numero_commande,
            fournisseur,
            status,
            date_creation,
            date_reception_reelle
          )
        `)
        .eq('article_id', selectedArticleId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArticleId
  });

  // Filtrer les données selon le type sélectionné
  const filteredMovements = movements.filter(m => {
    if (filterType === "all") return true;
    if (filterType === "entree") return m.type === "entree";
    if (filterType === "sortie") return m.type === "sortie";
    return false;
  });

  const showCommandes = filterType === "all" || filterType === "commande";
  const showMovements = filterType !== "commande";

  // Fonction d'export
  const handleExport = () => {
    if (!selectedArticle) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Historique de l'article: " + selectedArticle.reference + " - " + selectedArticle.designation + "\n\n";
    
    if (showMovements && filteredMovements.length > 0) {
      csvContent += "MOUVEMENTS DE STOCK\n";
      csvContent += "Date,Type,Quantité,Motif\n";
      filteredMovements.forEach(m => {
        csvContent += `${new Date(m.created_at).toLocaleDateString('fr-FR')},${m.type},${m.quantity},"${m.motif}"\n`;
      });
      csvContent += "\n";
    }

    if (showCommandes && commandeItems.length > 0) {
      csvContent += "COMMANDES\n";
      csvContent += "Date,N° Commande,Fournisseur,Qté Commandée,Qté Reçue,Statut\n";
      commandeItems.forEach(item => {
        const cmd = item.commandes;
        csvContent += `${new Date(cmd.date_creation).toLocaleDateString('fr-FR')},${cmd.numero_commande},${cmd.fournisseur},${item.quantite_commandee},${item.quantite_recue},${cmd.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historique_${selectedArticle.reference}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Historique exporté avec succès");
  };

  const stats = selectedArticle ? {
    totalEntrees: movements.filter(m => m.type === 'entree').reduce((sum, m) => sum + m.quantity, 0),
    totalSorties: movements.filter(m => m.type === 'sortie').reduce((sum, m) => sum + m.quantity, 0),
    totalCommandes: commandeItems.length,
    stockActuel: selectedArticle.stock
  } : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique par article
            </CardTitle>
            <CardDescription>
              Consultez l'historique complet des mouvements et commandes d'un article
            </CardDescription>
          </div>
          {selectedArticleId && (
            <Button onClick={handleExport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-2 sm:px-6">
        {/* Sélection de l'article et du filtre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Sélectionner un article</label>
            <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un article..." />
              </SelectTrigger>
              <SelectContent>
                {articles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    {article.reference} - {article.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Type d'historique</label>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout afficher</SelectItem>
                <SelectItem value="entree">Entrées uniquement</SelectItem>
                <SelectItem value="sortie">Sorties uniquement</SelectItem>
                <SelectItem value="commande">Commandes uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistiques */}
        {selectedArticle && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl md:text-2xl font-bold">{stats.stockActuel}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Stock actuel</div>
            </div>
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.totalEntrees}</div>
              <div className="text-xs md:text-sm text-green-600">Total entrées</div>
            </div>
            <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-red-600">{stats.totalSorties}</div>
              <div className="text-xs md:text-sm text-red-600">Total sorties</div>
            </div>
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.totalCommandes}</div>
              <div className="text-xs md:text-sm text-blue-600">Commandes</div>
            </div>
          </div>
        )}

        {/* Informations de l'article */}
        {selectedArticle && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Informations article</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Référence:</span>{" "}
                <span className="font-medium">{selectedArticle.reference}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marque:</span>{" "}
                <span className="font-medium">{selectedArticle.marque}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Catégorie:</span>{" "}
                <span className="font-medium">{selectedArticle.categorie}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Emplacement:</span>{" "}
                <span className="font-medium">{selectedArticle.emplacement || "-"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des mouvements */}
        {selectedArticleId && showMovements && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Mouvements de stock ({filteredMovements.length})
            </h3>
            {filteredMovements.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Motif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'entree' ? 'default' : 'secondary'}>
                            {movement.type === 'entree' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {movement.type === 'entree' ? 'Entrée' : 'Sortie'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          <span className={movement.type === 'entree' ? 'text-green-600' : 'text-red-600'}>
                            {movement.type === 'entree' ? '+' : '-'}{movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{movement.motif}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucun mouvement trouvé</p>
            )}
          </div>
        )}

        {/* Tableau des commandes */}
        {selectedArticleId && showCommandes && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Commandes ({commandeItems.length})
            </h3>
            {commandeItems.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead className="text-center">Qté commandée</TableHead>
                      <TableHead className="text-center">Qté reçue</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commandeItems.map((item) => {
                      const cmd = item.commandes;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {new Date(cmd.date_creation).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="font-medium">{cmd.numero_commande}</TableCell>
                          <TableCell>{cmd.fournisseur}</TableCell>
                          <TableCell className="text-center">{item.quantite_commandee}</TableCell>
                          <TableCell className="text-center">
                            <span className={item.quantite_recue === item.quantite_commandee ? 'text-green-600' : 'text-orange-600'}>
                              {item.quantite_recue}
                            </span>
                          </TableCell>
                          <TableCell>{item.prix_unitaire.toFixed(2)} €</TableCell>
                          <TableCell>
                            <Badge variant="outline">{cmd.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune commande trouvée</p>
            )}
          </div>
        )}

        {!selectedArticleId && (
          <p className="text-center text-muted-foreground py-12">
            Sélectionnez un article pour voir son historique
          </p>
        )}
      </CardContent>
    </Card>
  );
}
