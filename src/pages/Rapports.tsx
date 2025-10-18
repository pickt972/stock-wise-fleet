import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download, FileText, TrendingUp, Package, Users, Calendar, AlertTriangle, LineChart, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StockAnomaliesReport } from "@/components/reports/StockAnomaliesReport";
import { StockChartsReport } from "@/components/reports/StockChartsReport";
import { ArticleHistoryReport } from "@/components/reports/ArticleHistoryReport";

export default function Rapports() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedReport, setSelectedReport] = useState("stock");

  const { data: stockData = [], isLoading: stockLoading } = useQuery({
    queryKey: ['stock-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('stock', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: movementsData = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['movements-report', selectedPeriod],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(selectedPeriod));
      
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          articles!inner(reference, designation, marque)
        `)
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: commandesData = [], isLoading: commandesLoading } = useQuery({
    queryKey: ['commandes-report', selectedPeriod],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(selectedPeriod));
      
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Calculs pour les statistiques
  const totalStockValue = stockData.reduce((total, article) => total + (article.stock * article.prix_achat), 0);
  const lowStockItems = stockData.filter(article => article.stock <= article.stock_min).length;
  const totalMovements = movementsData.length;
  const totalCommandes = commandesData.length;

  const renderStockReport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Rapport de stock
        </CardTitle>
        <CardDescription>
          État actuel du stock et articles en alerte
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl md:text-2xl font-bold">{stockData.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Articles au catalogue</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl md:text-2xl font-bold">{totalStockValue.toFixed(2)} €</div>
            <div className="text-xs md:text-sm text-muted-foreground">Valeur totale du stock</div>
          </div>
          <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-orange-600">{lowStockItems}</div>
            <div className="text-xs md:text-sm text-orange-600">Articles en stock faible</div>
          </div>
        </div>

        {/* Version desktop avec tableau */}
        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Stock actuel</TableHead>
                <TableHead>Stock minimum</TableHead>
                <TableHead>Valeur stock</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.slice(0, 10).map((article) => {
                const stockValue = article.stock * article.prix_achat;
                const isLowStock = article.stock <= article.stock_min;
                
                return (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.reference}</TableCell>
                    <TableCell>{article.designation}</TableCell>
                    <TableCell className="text-center">{article.stock}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{article.stock_min}</TableCell>
                    <TableCell>{stockValue.toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge variant={isLowStock ? "destructive" : "default"}>
                        {isLowStock ? "Stock faible" : "OK"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Version mobile avec cartes */}
        <div className="md:hidden space-y-3">
          {stockData.slice(0, 10).map((article) => {
            const stockValue = article.stock * article.prix_achat;
            const isLowStock = article.stock <= article.stock_min;
            
            return (
              <Card key={article.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{article.reference}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{article.designation}</div>
                    </div>
                    <Badge variant={isLowStock ? "destructive" : "default"} className="ml-2">
                      {isLowStock ? "Faible" : "OK"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Stock</div>
                      <div className="font-medium">{article.stock}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Min.</div>
                      <div className="font-medium">{article.stock_min}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Valeur</div>
                      <div className="font-medium">{stockValue.toFixed(2)} €</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderMovementsReport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rapport des mouvements
        </CardTitle>
        <CardDescription>
          Mouvements de stock sur les {selectedPeriod} derniers jours
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {movementsData.filter(m => m.type === 'entree').length}
            </div>
            <div className="text-xs md:text-sm text-green-600">Entrées</div>
          </div>
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {movementsData.filter(m => m.type === 'sortie').length}
            </div>
            <div className="text-xs md:text-sm text-red-600">Sorties</div>
          </div>
        </div>

        {/* Version desktop avec tableau */}
        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsData.slice(0, 10).map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={movement.type === 'entree' ? 'default' : 'secondary'}>
                      {movement.type === 'entree' ? 'Entrée' : 'Sortie'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {movement.articles?.reference} - {movement.articles?.designation}
                  </TableCell>
                  <TableCell className="text-center">{movement.quantity}</TableCell>
                  <TableCell>{movement.motif}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Version mobile avec cartes */}
        <div className="md:hidden space-y-3">
          {movementsData.slice(0, 10).map((movement) => (
            <Card key={movement.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-muted-foreground">
                    {new Date(movement.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <Badge variant={movement.type === 'entree' ? 'default' : 'secondary'}>
                    {movement.type === 'entree' ? 'Entrée' : 'Sortie'}
                  </Badge>
                </div>
                <div className="text-sm font-medium mb-2 line-clamp-2">
                  {movement.articles?.reference} - {movement.articles?.designation}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-muted-foreground">Quantité: </span>
                    <span className="font-medium">{movement.quantity}</span>
                  </div>
                  <div className="text-muted-foreground line-clamp-1 ml-2">
                    {movement.motif}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCommandesReport = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rapport des commandes
        </CardTitle>
        <CardDescription>
          Commandes créées sur les {selectedPeriod} derniers jours
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl md:text-2xl font-bold">{commandesData.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Commandes totales</div>
          </div>
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-blue-600">
              {commandesData.reduce((sum, cmd) => sum + cmd.total_ht, 0).toFixed(2)} €
            </div>
            <div className="text-xs md:text-sm text-blue-600">Montant total HT</div>
          </div>
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {commandesData.filter(cmd => cmd.status === 'recu_complet').length}
            </div>
            <div className="text-xs md:text-sm text-green-600">Commandes reçues</div>
          </div>
        </div>

        {/* Version desktop avec tableau */}
        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Commande</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandesData.slice(0, 10).map((commande) => (
                <TableRow key={commande.id}>
                  <TableCell className="font-medium">{commande.numero_commande}</TableCell>
                  <TableCell>{commande.fournisseur}</TableCell>
                  <TableCell>
                    {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{commande.status}</Badge>
                  </TableCell>
                  <TableCell>{commande.total_ht.toFixed(2)} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Version mobile avec cartes */}
        <div className="md:hidden space-y-3">
          {commandesData.slice(0, 10).map((commande) => (
            <Card key={commande.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{commande.numero_commande}</div>
                    <div className="text-xs text-muted-foreground">{commande.fournisseur}</div>
                  </div>
                  <Badge variant="outline" className="ml-2">{commande.status}</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="text-muted-foreground">
                    {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="font-medium">
                    {commande.total_ht.toFixed(2)} €
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
            <p className="text-muted-foreground">
              Analyses et statistiques de votre activité
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">1 an</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Sélecteur de rapport */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button
            variant={selectedReport === "stock" ? "default" : "outline"}
            onClick={() => setSelectedReport("stock")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Package className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Stock</span>
          </Button>
          <Button
            variant={selectedReport === "movements" ? "default" : "outline"}
            onClick={() => setSelectedReport("movements")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <TrendingUp className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Mouvements</span>
          </Button>
          <Button
            variant={selectedReport === "commandes" ? "default" : "outline"}
            onClick={() => setSelectedReport("commandes")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Commandes</span>
          </Button>
          <Button
            variant={selectedReport === "anomalies" ? "default" : "outline"}
            onClick={() => setSelectedReport("anomalies")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <AlertTriangle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Anomalies</span>
          </Button>
          <Button
            variant={selectedReport === "charts" ? "default" : "outline"}
            onClick={() => setSelectedReport("charts")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <LineChart className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Graphiques</span>
          </Button>
          <Button
            variant={selectedReport === "historique" ? "default" : "outline"}
            onClick={() => setSelectedReport("historique")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Historique</span>
          </Button>
        </div>

        {/* Affichage du rapport sélectionné */}
        {selectedReport === "stock" && renderStockReport()}
        {selectedReport === "movements" && renderMovementsReport()}
        {selectedReport === "commandes" && renderCommandesReport()}
        {selectedReport === "anomalies" && <StockAnomaliesReport />}
        {selectedReport === "charts" && <StockChartsReport />}
        {selectedReport === "historique" && <ArticleHistoryReport />}
      </div>
    </DashboardLayout>
  );
}