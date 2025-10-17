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

  const searchArticle = async (reference: string) => {
    if (!reference.trim()) return;
    // Normaliser l'entrée et dédoublonner les recherches rapprochées
    const raw = reference.trim();
    const numeric = raw.replace(/\D/g, '');
    const isNumeric = numeric.length > 0 && /\d+/.test(numeric);
    const q = isNumeric ? numeric : raw;

    const now = Date.now();
    if (q === lastQueryRef.current && now - lastSearchAtRef.current < 2500) {
      return; // éviter les requêtes et toasts répétés pour la même valeur
    }
    lastQueryRef.current = q;
    lastSearchAtRef.current = now;

    setIsSearching(true);
    try {

      // Chercher par référence OU par code-barres (exact)
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .or(`reference.eq.${q},code_barre.eq.${q}`)
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
        // Aucun résultat exact -> tenter des solutions de repli
        // q normalisé défini plus haut

        // 1) Correspondance partielle sur reference/code_barre (gestion des écarts de clé EAN)
        const likeKey = q.length > 8 ? q.slice(0, q.length - 1) : q;
        const { data: partials, error: partialErr } = await supabase
          .from('articles')
          .select('*')
          .or(`reference.ilike.%${likeKey}%,code_barre.ilike.%${likeKey}%`)
          .limit(5);

        if (partialErr) {
          throw partialErr;
        }

        if (partials && partials.length > 0) {
          const first = partials[0];
          setFoundArticle(first);
          onArticleFound?.(first);
          toast({
            title: "Correspondance partielle",
            description: `${first.designation} - ${first.marque}`,
          });
        } else {
          // 2) Recherche via la référence fournisseur
          const { data: af, error: afErr } = await supabase
            .from('article_fournisseurs')
            .select('article_id')
            .eq('reference_fournisseur', q)
            .limit(1);

          if (afErr) {
            throw afErr;
          }

          if (af && af.length > 0 && af[0].article_id) {
            const { data: artById, error: artErr } = await supabase
              .from('articles')
              .select('*')
              .eq('id', af[0].article_id)
              .maybeSingle();

            if (artErr) {
              throw artErr;
            }

            if (artById) {
              setFoundArticle(artById);
              onArticleFound?.(artById);
              toast({
                title: "Article trouvé (réf. fournisseur)",
                description: `${artById.designation} - ${artById.marque}`,
              });
            } else {
              const now2 = Date.now();
              if (now2 - notFoundToastAtRef.current > 2500) {
                toast({
                  title: "Article non trouvé",
                  description: `Aucun article trouvé avec: ${q}`,
                  variant: "destructive",
                });
                notFoundToastAtRef.current = now2;
              }
              setFoundArticle(null);
            }
          } else {
            const now3 = Date.now();
            if (now3 - notFoundToastAtRef.current > 2500) {
              toast({
                title: "Article non trouvé",
                description: `Aucun article trouvé avec: ${q}`,
                variant: "destructive",
              });
              notFoundToastAtRef.current = now3;
            }
            setFoundArticle(null);
          }
        }
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
              onChange={(e) => { setSearchQuery(e.target.value); lastQueryRef.current = ""; }}
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