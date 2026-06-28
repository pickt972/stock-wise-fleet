import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Package } from "lucide-react";
import { AccessoryReturnDialog } from "@/components/stock/AccessoryReturnDialog";

interface ActiveRental {
  id: string;
  client_name: string | null;
  expected_return_date: string | null;
  caution_amount: number | null;
  stock_exit_items: Array<{
    article_id: string;
    quantity: number;
    articles: {
      designation: string;
      reference: string;
    };
  }>;
}

interface ActiveRentalsProps {
  onReturnComplete?: () => void;
}

export function ActiveRentals({ onReturnComplete }: ActiveRentalsProps) {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<ActiveRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [returnDialog, setReturnDialog] = useState<{
    open: boolean;
    rental: ActiveRental | null;
  }>({ open: false, rental: null });

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const fetchActiveRentals = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_exits")
        .select(
          `
          *,
          stock_exit_items (
            *,
            articles (*)
          )
        `,
        )
        .eq("exit_type", "location_accessoire")
        .is("actual_return_date", null);

      if (error) throw error;
      setRentals(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les accessoires en location",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = (rental: ActiveRental) => {
    setReturnDialog({ open: true, rental });
  };

  const isLate = (date: string | null) => {
    if (!date) return false;
    return isPast(parseISO(date));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Accessoires en location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (rentals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Accessoires en location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun accessoire en location actuellement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Accessoires en location
            <Badge variant="secondary">{rentals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="font-medium">
                    {rental.stock_exit_items.map((item, idx) => (
                      <div key={idx}>
                        {item.articles.designation}
                        <span className="text-sm text-muted-foreground ml-2">({item.articles.reference})</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">Client: {rental.client_name || "Non renseigné"}</div>
                  {rental.caution_amount && (
                    <div className="text-sm text-muted-foreground">Caution: {rental.caution_amount}€</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {rental.expected_return_date && (
                    <div className="text-sm text-right">
                      <div className="text-muted-foreground">Retour prévu</div>
                      <div className="font-medium flex items-center gap-2">
                        {format(parseISO(rental.expected_return_date), "dd/MM/yyyy", { locale: fr })}
                        {isLate(rental.expected_return_date) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            RETARD
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleReturn(rental)}>
                    Retour
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {returnDialog.rental && (
        <AccessoryReturnDialog
          exit={returnDialog.rental as any}
          open={returnDialog.open}
          onOpenChange={(open) => setReturnDialog({ open, rental: open ? returnDialog.rental : null })}
          onSuccess={() => {
            setReturnDialog({ open: false, rental: null });
            fetchActiveRentals();
            onReturnComplete?.();
          }}
        />
      )}
    </div>
  );
}
