import { useState, useEffect } from "react";
import { MapPin, Package, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransfertEmplacementDialog } from "@/components/transferts/TransfertEmplacementDialog";

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

  // Fonction pour générer des couleurs consistantes basées sur le texte
  const getColorForText = (text: string): string => {
    if (!text) return "default";
    
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-300",
      "bg-green-100 text-green-800 border-green-300", 
      "bg-purple-100 text-purple-800 border-purple-300",
      "bg-orange-100 text-orange-800 border-orange-300",
      "bg-pink-100 text-pink-800 border-pink-300",
      "bg-teal-100 text-teal-800 border-teal-300",
      "bg-indigo-100 text-indigo-800 border-indigo-300",
      "bg-yellow-100 text-yellow-800 border-yellow-300",
      "bg-red-100 text-red-800 border-red-300",
      "bg-cyan-100 text-cyan-800 border-cyan-300"
    ];
    
    // Hash simple pour obtenir un index consistant
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

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
      <CardContent className="space-y-3">
        {emplacements.map((emplacement) => (
          <div
            key={`${emplacement.emplacement}-${emplacement.id}`}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
               <div>
                 <Badge 
                   variant="outline"
                   className={`text-xs ${getColorForText(emplacement.emplacement)}`}
                 >
                   {emplacement.emplacement}
                 </Badge>
                 <div className="text-sm text-muted-foreground mt-1">
                   Emplacement
                 </div>
               </div>
            </div>
            <Badge variant={emplacement.stock > 0 ? "default" : "secondary"}>
              {emplacement.stock} unité(s)
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}