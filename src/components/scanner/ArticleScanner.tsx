import { useState } from "react";
import { QrCode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "./BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  prix_achat: number;
  emplacement: string;
}

interface ArticleScannerProps {
  onArticleFound?: (article: Article) => void;
}

export function ArticleScanner({ onArticleFound }: ArticleScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [foundArticle, setFoundArticle] = useState<Article | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const searchArticle = async (reference: string) => {
    if (!reference.trim()) return;

    setIsSearching(true);
    try {
      // Chercher par référence OU par code-barres
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .or(`reference.eq.${reference.trim()},code_barre.eq.${reference.trim()}`)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Plusieurs lignes retournées quand un objet unique est attendu
          toast({
            title: "Plusieurs résultats",
            description: `Plusieurs articles correspondent à "${reference}". Affinez la recherche.`,
            variant: "destructive",
          });
          setFoundArticle(null);
        } else {
          throw error;
        }
      } else if (!data) {
        // Aucun résultat trouvé avec maybeSingle -> data === null et pas d'erreur
        toast({
          title: "Article non trouvé",
          description: `Aucun article trouvé avec: ${reference}`,
          variant: "destructive",
        });
        setFoundArticle(null);
      } else {
        setFoundArticle(data);
        onArticleFound?.(data);
        toast({
          title: "Article trouvé !",
          description: `${data.designation} - ${data.marque}`,
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la recherche:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche de l'article",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanResult = (scannedCode: string) => {
    setShowScanner(false);
    setSearchQuery(scannedCode);
    
    // Délai pour laisser le scanner se fermer proprement
    setTimeout(() => {
      searchArticle(scannedCode);
    }, 200);
  };

  const handleSearch = () => {
    searchArticle(searchQuery);
  };

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Rupture" };
    if (stock <= stockMin) return { variant: "secondary" as const, label: "Faible" };
    return { variant: "default" as const, label: "OK" };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Recherche d'article par scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Référence de l'article ou scanner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              size="sm"
              className="flex-shrink-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isSearching && (
            <div className="text-center text-muted-foreground">
              Recherche en cours...
            </div>
          )}

          {foundArticle && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{foundArticle.designation}</h3>
                      <p className="text-sm text-muted-foreground">
                        {foundArticle.marque} • {foundArticle.categorie}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {foundArticle.reference}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{foundArticle.stock}</p>
                        <Badge 
                          variant={getStockStatus(foundArticle.stock, foundArticle.stock_min).variant}
                          className="text-xs"
                        >
                          {getStockStatus(foundArticle.stock, foundArticle.stock_min).label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prix</p>
                      <p className="font-medium">€{foundArticle.prix_achat.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock mini</p>
                      <p className="font-medium">{foundArticle.stock_min}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Emplacement</p>
                      <p className="font-medium">{foundArticle.emplacement || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Scanner de code-barres */}
      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}