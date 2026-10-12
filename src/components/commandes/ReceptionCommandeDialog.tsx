import { useState, useEffect } from "react";
import { draftDatePrefix, nextDraftReference } from "@/lib/draftReference";
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

  const createDraftArticles = async (done: Record<string, DraftCompletion | null>) => {
    const { data: u } = await supabase.auth.getUser();
    const map: Record<string, string> = {};
    const { data: used } = await supabase.from('articles').select('reference').like('reference', `${draftDatePrefix()}%`);
    const usedRefs = (used || []).map((r: any) => r.reference as string);
    for (const item of items.filter((i) => i.quantite_a_recevoir > 0 && !i.article_id)) {
      const c = done[item.id];
      let ref = c?.reference?.trim();
      if (!ref) { ref = nextDraftReference(usedRefs); usedRefs.push(ref); }
      const { data: art, error } = await supabase.from('articles').insert([{
        designation: c?.designation?.trim() || item.designation,
        reference: ref,
        marque: c?.marque?.trim() || '',
        categorie: c?.categorie || 'À classer',
        sous_categorie: c?.sous_categorie || null,
        code_barre: c?.code_barre?.trim() || (item as any).code_barre || null,
        prix_achat: c ? c.prix_achat : item.prix_unitaire,
        emplacement_id: c?.emplacement_id || null,
        stock: 0, stock_min: 0, stock_max: 0,
        is_draft: !c,
        user_id: u.user?.id,
      }]).select('id').single();
      if (error) throw error;
      map[item.id] = art.id;
      const { error: ciErr } = await supabase.from('commande_items')
        .update({ article_id: art.id, is_draft: !c, reference: ref, ...(c ? { designation: c.designation.trim(), prix_unitaire: c.prix_achat } : {}) })
        .eq('id', item.id);
      if (ciErr) throw ciErr;
    }
    return map;
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
      const createdIds = await createDraftArticles(done);
      // Récupérer les article_id de tous les items d'un coup
      const { data: commandeItemsData } = await supabase
        .from('commande_items')
        .select('id, article_id')
        .eq('commande_id', commandeId);

      const articleIdByItemId: Record<string, string | null> = {};
      (commandeItemsData || []).forEach((ci: any) => {
        articleIdByItemId[ci.id] = ci.article_id;
      });
      Object.assign(articleIdByItemId, createdIds);

      // Créer une entrée stock globale pour cette réception
      const itemsARecevoir = items.filter(i => i.quantite_a_recevoir > 0);

      const { data: stockEntry, error: entryError } = await supabase
        .from('stock_entries')
        .insert([{
          entry_number: '',           // trigger génère ENT-YYYY-XXXXXX
          entry_type: 'commande',
          notes: `Réception commande ${commandeNumero}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Insérer les items de l'entrée pour chaque article reçu
      // Le trigger trigger_update_stock_on_entry incrémente automatiquement articles.stock
      for (const item of itemsARecevoir) {
        const articleId = articleIdByItemId[item.id];

        // Mettre à jour quantite_recue dans commande_items
        const nouvelleQuantiteRecue = item.quantite_recue + item.quantite_a_recevoir;
        const { error: ciError } = await supabase
          .from('commande_items')
          .update({ quantite_recue: nouvelleQuantiteRecue })
          .eq('id', item.id);
        if (ciError) throw ciError;

        // Créer le stock_entry_item seulement si l'article est lié
        if (articleId) {
          const { error: itemError } = await supabase
            .from('stock_entry_items')
            .insert([{
              entry_id: stockEntry.id,
              article_id: articleId,
              quantity: item.quantite_a_recevoir,
              unit_price: 0,
            }]);
          if (itemError) throw itemError;
          // Le trigger update_stock_on_entry incrémente articles.stock
          // et crée le mouvement dans stock_movements automatiquement
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
