import { useState, useRef } from "react";
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
  const [suggestions, setSuggestions] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const lastQueryRef = useRef<string>("");
  const lastSearchAtRef = useRef<number>(0);
  const notFoundToastAtRef = useRef<number>(0);
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastAtRef = useRef<number>(0);

  const maybeToast = (
    key: string,
    opts: { title: string; description?: string; variant?: "default" | "destructive" }
  ) => {
    const now = Date.now();
    if (lastToastKeyRef.current === key && now - lastToastAtRef.current < 2500) return;
    lastToastKeyRef.current = key;
    lastToastAtRef.current = now;
    toast(opts);
  };

  const searchArticle = async (reference: string) => {
    if (!reference.trim()) return;
    
    // Normaliser l'entrée
    const raw = reference.trim();
    const numeric = raw.replace(/\D/g, '');
    const q = numeric.length >= 8 ? numeric : raw;

    // Éviter les recherches en double rapprochées
    const now = Date.now();
    if (q === lastQueryRef.current && now - lastSearchAtRef.current < 2000) {
      console.log("Recherche ignorée (doublon):", q);
      return;
    }
    lastQueryRef.current = q;
    lastSearchAtRef.current = now;

    setIsSearching(true);
    try {
      // Recherche exacte
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .or(`reference.eq.${q},code_barre.eq.${q}`)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        // Trouvé!
        setFoundArticle(data);
        onArticleFound?.(data);
        maybeToast(`found:${data.id}`, {
          title: "Article trouvé",
          description: `${data.designation} - ${data.marque}`,
        });
      } else {
        // Recherche partielle
        const likeKey = q.length > 8 ? q.slice(0, -1) : q;
        const { data: partials } = await supabase
          .from('articles')
          .select('*')
          .or(`reference.ilike.%${likeKey}%,code_barre.ilike.%${likeKey}%`)
          .limit(3);

        if (partials && partials.length > 0) {
          setFoundArticle(partials[0]);
          onArticleFound?.(partials[0]);
          maybeToast(`partial:${partials[0].id}`,{
            title: "Correspondance partielle",
            description: `${partials[0].designation} - ${partials[0].marque}`,
          });
        } else {
          // Pas trouvé
          const now2 = Date.now();
          if (now2 - notFoundToastAtRef.current > 3000) {
            toast({
              title: "Article non trouvé",
              description: `Code: ${q}`,
              variant: "destructive",
            });
            notFoundToastAtRef.current = now2;
          }
          setFoundArticle(null);
        }
      }
    } catch (error: any) {
      console.error('Erreur recherche:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
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
    if (isSearching) return;
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isSearching) handleSearch();
                }
              }}
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