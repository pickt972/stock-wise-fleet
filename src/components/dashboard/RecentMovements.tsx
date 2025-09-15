import { useState, useEffect } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  motif: string;
  created_at: string;
  article: {
    reference: string;
    designation: string;
  };
  profile: {
    first_name: string;
    last_name: string;
  };
  vehicule?: {
    immatriculation: string;
  };
}

export function RecentMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          type,
          quantity,
          motif,
          created_at,
          article_id,
          user_id,
          vehicule_id
        `)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      if (data && data.length > 0) {
        const articleIds = [...new Set(data.map(m => m.article_id))];
        const userIds = [...new Set(data.map(m => m.user_id))];
        const vehiculeIds = [...new Set(data.map(m => m.vehicule_id).filter(Boolean))];

        const [articlesResponse, profilesResponse, vehiculesResponse] = await Promise.all([
          supabase.from('articles').select('id, reference, designation').in('id', articleIds),
          supabase.from('profiles').select('id, first_name, last_name').in('id', userIds),
          vehiculeIds.length > 0 
            ? supabase.from('vehicules').select('id, immatriculation').in('id', vehiculeIds)
            : Promise.resolve({ data: [] })
        ]);

        const articlesMap = new Map(articlesResponse.data?.map(a => [a.id, a]) || []);
        const profilesMap = new Map(profilesResponse.data?.map(p => [p.id, p]) || []);
        const vehiculesMap = new Map((vehiculesResponse.data || []).map(v => [v.id, v]));

        const enrichedMovements = data.map(movement => ({
          ...movement,
          article: articlesMap.get(movement.article_id) || { reference: '', designation: '' },
          profile: profilesMap.get(movement.user_id) || { first_name: '', last_name: '' },
          vehicule: movement.vehicule_id ? vehiculesMap.get(movement.vehicule_id) : undefined
        }));

        setMovements(enrichedMovements as Movement[]);
      } else {
        setMovements([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des mouvements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovementClick = (type: string) => {
    if (type === 'entree') {
      navigate('/entrees');
    } else if (type === 'sortie') {
      navigate('/sorties');
    }
  };
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Mouvements Récents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Chargement des mouvements...
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Aucun mouvement récent
          </div>
        ) : (
          movements.map((movement) => (
            <Button
              key={movement.id}
              variant="ghost"
              className="w-full h-auto p-3 justify-between hover:bg-muted/50 transition-colors"
              onClick={() => handleMovementClick(movement.type)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  movement.type === "entree" 
                    ? "bg-success-light text-success" 
                    : "bg-warning-light text-warning"
                }`}>
                  {movement.type === "entree" ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-foreground">{movement.article.designation}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{movement.article.reference}</span>
                    <span>•</span>
                    <span>{movement.profile.first_name} {movement.profile.last_name}</span>
                    {movement.vehicule && (
                      <>
                        <span>•</span>
                        <span className="font-medium">{movement.vehicule.immatriculation}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant={movement.type === "entree" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {movement.type === "entree" ? "+" : "-"}{movement.quantity}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(movement.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </Button>
          ))
        )}
      </CardContent>
    </Card>
  );
}