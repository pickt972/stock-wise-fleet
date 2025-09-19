import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Inventaire() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('reference');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredArticles = articles.filter(article =>
    article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.marque.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = articles.reduce((total, article) => total + (article.stock * article.prix_achat), 0);
  const totalArticles = articles.length;
  const lowStockCount = articles.filter(article => article.stock <= article.stock_min).length;

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { label: "Rupture", variant: "destructive" as const };
    if (stock <= stockMin) return { label: "Stock faible", variant: "outline" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventaire</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de votre stock et inventaire
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Rapport
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur totale du stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalValue.toFixed(2)} €</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles au catalogue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArticles}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles en stock faible</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des articles */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>État du stock</CardTitle>
                <CardDescription>
                  Consultez l'état actuel de votre inventaire
                </CardDescription>
              </div>
              
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>Marque</TableHead>
                      <TableHead>Stock actuel</TableHead>
                      <TableHead>Stock min.</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Valeur stock</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => {
                      const stockStatus = getStockStatus(article.stock, article.stock_min);
                      const stockValue = article.stock * article.prix_achat;
                      
                      return (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium">{article.reference}</TableCell>
                          <TableCell>{article.designation}</TableCell>
                          <TableCell>{article.marque}</TableCell>
                          <TableCell className="text-center font-medium">{article.stock}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{article.stock_min}</TableCell>
                          <TableCell>{article.prix_achat.toFixed(2)} €</TableCell>
                          <TableCell className="font-medium">{stockValue.toFixed(2)} €</TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {filteredArticles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Aucun article trouvé pour cette recherche" : "Aucun article dans l'inventaire"}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}