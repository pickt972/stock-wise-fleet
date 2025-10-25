import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  motif: string;
  created_at: string;
  articles: {
    designation: string;
    reference: string;
  };
}

export default function HistoriqueMouvements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
          articles (
            designation,
            reference
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entree':
        return '➕';
      case 'sortie':
        return '✏️';
      default:
        return '📦';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'entree':
        return <Badge className="bg-success text-success-foreground">Entrée</Badge>;
      case 'sortie':
        return <Badge className="bg-warning text-warning-foreground">Sortie</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title="Historique" showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {movements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Aucun mouvement enregistré
              </CardContent>
            </Card>
          ) : (
            movements.map((movement) => (
              <Card key={movement.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getTypeIcon(movement.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {movement.articles?.designation || 'Article supprimé'}
                        </h3>
                        {getTypeBadge(movement.type)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {movement.motif} • Quantité: {movement.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
