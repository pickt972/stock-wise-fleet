import { useState, useEffect, useMemo } from "react";
import { Search, Save, AlertTriangle, CheckCircle, Package, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InventaireItem {
  id: string;
  article_id: string;
  stock_theorique: number;
  stock_compte: number | null;
  ecart: number | null;
  emplacement?: string;
  counted_by?: string;
  date_comptage?: string;
  articles: {
    reference: string;
    designation: string;
    marque: string;
  };
}

interface InventaireTableProps {
  inventaireId: string;
  onItemUpdate?: () => void;
}

export function InventaireTable({ inventaireId, onItemUpdate }: InventaireTableProps) {
  const [items, setItems] = useState<InventaireItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stockValues, setStockValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchInventaireItems();
  }, [inventaireId]);

  const fetchInventaireItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventaire_items')
        .select(`
          *,
          articles (
            reference,
            designation,
            marque
          )
        `)
        .eq('inventaire_id', inventaireId)
        .order('articles(reference)');

      if (error) throw error;
      setItems(data || []);

      // Initialiser les valeurs de stock
      const initialValues: Record<string, string> = {};
      data?.forEach(item => {
        initialValues[item.id] = item.stock_compte?.toString() || '';
      });
      setStockValues(initialValues);
    } catch (error) {
      console.error('Erreur lors du chargement des items:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles de l'inventaire.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.articles.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.articles.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.articles.marque.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    const total = items.length;
    const counted = items.filter(item => item.stock_compte !== null).length;
    const withVariance = items.filter(item => item.ecart !== null && item.ecart !== 0).length;
    const remaining = total - counted;

    return { total, counted, withVariance, remaining };
  }, [items]);

  const updateStockValue = (itemId: string, value: string) => {
    setStockValues(prev => ({ ...prev, [itemId]: value }));
  };

  const saveStockCount = async (itemId: string) => {
    try {
      const stockValue = stockValues[itemId];
      if (stockValue === '') return;

      const stockCount = parseInt(stockValue);
      if (isNaN(stockCount) || stockCount < 0) {
        toast({
          title: "Valeur invalide",
          description: "Veuillez saisir un nombre positif.",
          variant: "destructive",
        });
        return;
      }

      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse.user) return;

      const { error } = await supabase
        .from('inventaire_items')
        .update({
          stock_compte: stockCount,
          counted_by: userResponse.user.id,
          date_comptage: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;

      await fetchInventaireItems();
      onItemUpdate?.();

      toast({
        title: "Stock enregistré",
        description: "Le comptage a été sauvegardé.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le comptage.",
        variant: "destructive",
      });
    }
  };

  const getEcartBadge = (ecart: number | null) => {
    if (ecart === null) return null;
    
    if (ecart === 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Conforme</Badge>;
    } else if (ecart > 0) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">+{ecart}</Badge>;
    } else {
      return <Badge variant="destructive">-{Math.abs(ecart)}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des articles...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total articles</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Comptés</p>
                <p className="text-2xl font-bold">{stats.counted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Restants</p>
                <p className="text-2xl font-bold">{stats.remaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Écarts</p>
                <p className="text-2xl font-bold">{stats.withVariance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Articles à inventorier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Marque</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-center">Stock théorique</TableHead>
                  <TableHead className="text-center">Stock compté</TableHead>
                  <TableHead className="text-center">Écart</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className={item.ecart !== null && item.ecart !== 0 ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">
                      {item.articles.reference}
                    </TableCell>
                    <TableCell>{item.articles.designation}</TableCell>
                    <TableCell>{item.articles.marque}</TableCell>
                    <TableCell>
                      {item.emplacement && (
                        <Badge variant="outline">{item.emplacement}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.stock_theorique}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={stockValues[item.id] || ''}
                        onChange={(e) => updateStockValue(item.id, e.target.value)}
                        className="w-20 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {getEcartBadge(item.ecart)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => saveStockCount(item.id)}
                        disabled={!stockValues[item.id] || stockValues[item.id] === ''}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun article trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}