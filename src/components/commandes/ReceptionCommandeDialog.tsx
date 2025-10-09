import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PackageCheck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReceptionItem {
  id: string;
  designation: string;
  reference?: string;
  quantite_commandee: number;
  quantite_recue: number;
  quantite_a_recevoir: number;
}

interface ReceptionCommandeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commandeId: string;
  commandeNumero: string;
  onSuccess: () => void;
}

export function ReceptionCommandeDialog({
  isOpen,
  onClose,
  commandeId,
  commandeNumero,
  onSuccess
}: ReceptionCommandeDialogProps) {
  const [items, setItems] = useState<ReceptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && commandeId) {
      fetchCommandeItems();
    }
  }, [isOpen, commandeId]);

  const fetchCommandeItems = async () => {
    try {
      const { data, error } = await supabase
        .from('commande_items')
        .select('*')
        .eq('commande_id', commandeId);

      if (error) throw error;

      const receptionItems: ReceptionItem[] = (data || []).map(item => ({
        id: item.id,
        designation: item.designation,
        reference: item.reference,
        quantite_commandee: item.quantite_commandee,
        quantite_recue: item.quantite_recue,
        quantite_a_recevoir: item.quantite_commandee - item.quantite_recue
      }));

      setItems(receptionItems);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateQuantiteARecevoir = (itemId: string, quantite: number) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantite_a_recevoir: Math.max(0, Math.min(quantite, item.quantite_commandee - item.quantite_recue)) }
        : item
    ));
  };

  const handleReceptionPartielle = async () => {
    setIsLoading(true);
    try {
      // Mettre à jour les quantités reçues pour chaque item
      for (const item of items) {
        if (item.quantite_a_recevoir > 0) {
          const nouvelleQuantiteRecue = item.quantite_recue + item.quantite_a_recevoir;
          
          const { error } = await supabase
            .from('commande_items')
            .update({ quantite_recue: nouvelleQuantiteRecue })
            .eq('id', item.id);

          if (error) throw error;

          // Mettre à jour le stock de l'article si article_id existe
          if (item.id) {
            const { data: itemData } = await supabase
              .from('commande_items')
              .select('article_id')
              .eq('id', item.id)
              .single();

            if (itemData?.article_id) {
              const { error: stockError } = await supabase.rpc('update_article_stock', {
                article_id: itemData.article_id,
                quantity_change: item.quantite_a_recevoir
              });

              if (stockError) throw stockError;
            }
          }
        }
      }

      // Vérifier si tous les items sont complètement reçus
      const { data: updatedItems } = await supabase
        .from('commande_items')
        .select('quantite_commandee, quantite_recue')
        .eq('commande_id', commandeId);

      const allReceived = updatedItems?.every(
        item => item.quantite_recue >= item.quantite_commandee
      );

      const hasPartialReception = updatedItems?.some(
        item => item.quantite_recue > 0 && item.quantite_recue < item.quantite_commandee
      );

      // Mettre à jour le statut de la commande
      let newStatus: 'brouillon' | 'envoye' | 'confirme' | 'recu_partiel' | 'recu_complet' | 'annule';
      let dateReceptionReelle = null;

      if (allReceived) {
        newStatus = 'recu_complet';
        dateReceptionReelle = new Date().toISOString();
      } else if (hasPartialReception || updatedItems?.some(item => item.quantite_recue > 0)) {
        newStatus = 'recu_partiel';
      } else {
        newStatus = 'confirme';
      }

      const { error: commandeError } = await supabase
        .from('commandes')
        .update({ 
          status: newStatus,
          date_reception_reelle: dateReceptionReelle
        })
        .eq('id', commandeId);

      if (commandeError) throw commandeError;

      toast({
        title: "Réception enregistrée",
        description: allReceived 
          ? "Commande complètement reçue" 
          : "Réception partielle enregistrée",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecevoirTout = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      quantite_a_recevoir: item.quantite_commandee - item.quantite_recue
    })));
  };

  const totalARecevoir = items.reduce((sum, item) => sum + item.quantite_a_recevoir, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Réception de commande - {commandeNumero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={handleRecevoirTout} 
              variant="outline" 
              size="sm"
            >
              Tout recevoir
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{item.designation}</p>
                    {item.reference && (
                      <p className="text-sm text-muted-foreground">Réf: {item.reference}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Commandé: {item.quantite_commandee}
                    </Badge>
                    {item.quantite_recue > 0 && (
                      <Badge variant="secondary">
                        Déjà reçu: {item.quantite_recue}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`qty-${item.id}`}>Quantité à recevoir</Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      min="0"
                      max={item.quantite_commandee - item.quantite_recue}
                      value={item.quantite_a_recevoir}
                      onChange={(e) => updateQuantiteARecevoir(item.id, parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Reste à recevoir: {item.quantite_commandee - item.quantite_recue}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalARecevoir > 0 && (
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm font-medium">
                Total à recevoir: {totalARecevoir} article(s)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleReceptionPartielle} 
            disabled={isLoading || totalARecevoir === 0}
          >
            <Package className="mr-2 h-4 w-4" />
            {isLoading ? "Enregistrement..." : "Valider la réception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
