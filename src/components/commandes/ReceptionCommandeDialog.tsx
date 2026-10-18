import { useState, useEffect } from "react";
import { receiveOrderLines } from "@/lib/receiveDraftLine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PackageCheck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DraftArticleCompletionDialog, DraftCompletion } from "./DraftArticleCompletionDialog";

interface ReceptionItem {
  id: string;
  designation: string;
  reference?: string;
  quantite_commandee: number;
  quantite_recue: number;
  quantite_a_recevoir: number;
  article_id?: string | null;
  prix_unitaire: number;
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
  const [draftQueue, setDraftQueue] = useState<ReceptionItem[]>([]);
  const [draftStep, setDraftStep] = useState(0);
  const [completions, setCompletions] = useState<Record<string, DraftCompletion | null>>({});

  const startValidation = () => {
    const drafts = items.filter((i) => i.quantite_a_recevoir > 0 && !i.article_id);
    if (drafts.length === 0) return handleReceptionPartielle({});
    setCompletions({});
    setDraftStep(0);
    setDraftQueue(drafts);
  };

  const recordCompletion = (c: DraftCompletion | null) => {
    const current = draftQueue[draftStep];
    const next = { ...completions, [current.id]: c };
    setCompletions(next);
    if (draftStep + 1 < draftQueue.length) setDraftStep(draftStep + 1);
    else { setDraftQueue([]); handleReceptionPartielle(next); }
  };

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
        quantite_a_recevoir: item.quantite_commandee - item.quantite_recue,
        article_id: item.article_id,
        prix_unitaire: Number(item.prix_unitaire) || 0,
        code_barre: (item as any).code_barre,
        categorie: (item as any).categorie,
        sous_categorie: (item as any).sous_categorie,
        vehicule_id: (item as any).vehicule_id,
      } as any));

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

  const handleReceptionPartielle = async (done: Record<string, DraftCompletion | null>) => {
    setIsLoading(true);
    try {
      const result = await receiveOrderLines(commandeId, items.filter(i => i.quantite_a_recevoir > 0).map(item => {
        const c = done[item.id];
        return {
          id: item.id, quantity: item.quantite_a_recevoir,
          unit_price: c ? c.prix_achat : item.prix_unitaire,
          article_id: item.article_id || null,
          new_article: c ? { ...c } : !item.article_id ? {
            designation: item.designation, reference: "", marque: "",
            categorie: (item as any).categorie || "À classer",
            sous_categorie: (item as any).sous_categorie || "",
            code_barre: (item as any).code_barre || "",
          } : null,
        };
      }));
      const allReceived = result.status === "recu_complet";

      toast({
        title: "Réception enregistrée",
        className: "bg-success text-success-foreground border-success",
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
    <>
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
                    {!item.article_id && <p className="text-xs text-warning">📋 Fiche incomplète — à compléter à la réception</p>}
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
            onClick={startValidation} 
            disabled={isLoading || totalARecevoir === 0}
          >
            <Package className="mr-2 h-4 w-4" />
            {isLoading ? "Enregistrement..." : "Valider la réception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {draftQueue[draftStep] && (
      <DraftArticleCompletionDialog
        open
        designation={draftQueue[draftStep].designation}
        estimatedPrice={draftQueue[draftStep].prix_unitaire}
        initialBarcode={(draftQueue[draftStep] as any).code_barre}
        initialCategorie={(draftQueue[draftStep] as any).categorie}
        initialSousCategorie={(draftQueue[draftStep] as any).sous_categorie}
        position={`${draftStep + 1}/${draftQueue.length}`}
        onSubmit={(c) => recordCompletion(c)}
        onSkip={() => recordCompletion(null)}
      />
    )}
    </>
  );
}
