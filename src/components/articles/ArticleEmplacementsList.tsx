import { useState, useEffect } from "react";
import { MapPin, Package, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransfertEmplacementDialog } from "@/components/transferts/TransfertEmplacementDialog";
import { useColorPreferences } from "@/hooks/useColorPreferences";

interface ArticleEmplacement {
  id: string;
  emplacement: string;
  emplacement_id: string;
  stock: number;
}

interface ArticleEmplacementsListProps {
  articleReference: string;
  articleDesignation: string;
}

export function ArticleEmplacementsList({ articleReference, articleDesignation }: ArticleEmplacementsListProps) {
  const [emplacements, setEmplacements] = useState<ArticleEmplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getColorForText } = useColorPreferences();

  useEffect(() => {
    fetchArticleEmplacements();
  }, [articleReference]);

  const fetchArticleEmplacements = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer tous les articles ayant la même référence
      const { data: articles, error } = await supabase
        .from('articles')
        .select(`
          id,
          emplacement,
          emplacement_id,
          stock
        `)
        .eq('reference', articleReference)
        .order('emplacement');

      if (error) throw error;

      // Grouper par emplacement et sommer les stocks
      const emplacementMap = new Map<string, ArticleEmplacement>();
      
      articles?.forEach(article => {
        const emplacementKey = article.emplacement || 'Non assigné';
        const existing = emplacementMap.get(emplacementKey);
        
        if (existing) {
          existing.stock += article.stock;
        } else {
          emplacementMap.set(emplacementKey, {
            id: article.id,
            emplacement: emplacementKey,
            emplacement_id: article.emplacement_id || '',
            stock: article.stock
          });
        }
      });

      setEmplacements(Array.from(emplacementMap.values()));
    } catch (error) {
      console.error('Erreur lors du chargement des emplacements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalStock = emplacements.reduce((total, emp) => total + emp.stock, 0);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Répartition par emplacement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (emplacements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Répartition par emplacement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Aucun emplacement trouvé</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Répartition par emplacement
            </CardTitle>
            <CardDescription className="mt-1">
              {articleDesignation} - Total: {totalStock} unité(s)
            </CardDescription>
          </div>
          <TransfertEmplacementDialog onTransfertCompleted={fetchArticleEmplacements} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-x-hidden">
        {emplacements.map((emplacement) => (
          <div
            key={`${emplacement.emplacement}-${emplacement.id}`}
            className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
               <div className="min-w-0 flex-1">
                 <Badge 
                   variant="outline"
                   className={`text-xs w-fit max-w-full break-words whitespace-normal ${getColorForText(emplacement.emplacement, 'location')}`}
                 >
                   {emplacement.emplacement}
                 </Badge>
                 <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                   Emplacement
                 </div>
               </div>
            </div>
            <Badge variant={emplacement.stock > 0 ? "default" : "secondary"} className="flex-shrink-0">
              {emplacement.stock}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}