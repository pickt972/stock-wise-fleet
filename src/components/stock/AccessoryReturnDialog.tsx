import { useState } from "react";
import { PackageCheck, AlertTriangle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface StockExit {
  id: string;
  caution_amount?: number;
  stock_exit_items: Array<{
    article_id: string;
    quantity: number;
    articles: {
      designation: string;
    };
  }>;
}

interface AccessoryReturnDialogProps {
  exit: StockExit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ReturnScenario = 'ok' | 'damaged' | 'not_returned';

export function AccessoryReturnDialog({
  exit,
  open,
  onOpenChange,
  onSuccess,
}: AccessoryReturnDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [scenario, setScenario] = useState<ReturnScenario>('ok');
  const [damageDescription, setDamageDescription] = useState("");
  const [reimbursementAmount, setReimbursementAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReturn = async () => {
    if (scenario === 'damaged' && !damageDescription.trim()) {
      toast({
        title: "Description requise",
        description: "Veuillez décrire les dommages",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (scenario === 'ok') {
        // Scénario 1: Retour OK → Créer une entrée automatique pour augmenter le stock
        const { data: entry, error: entryError } = await supabase
          .from("stock_entries")
          .insert([{
            entry_number: "",
            entry_type: "retour",
            notes: `Retour accessoire - Sortie ${exit.id}`,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (entryError) throw entryError;

        // Créer les items d'entrée
        const itemsToInsert = exit.stock_exit_items.map((item) => ({
          entry_id: entry.id,
          article_id: item.article_id,
          quantity: item.quantity,
          unit_price: 0,
        }));

        const { error: itemsError } = await supabase
          .from("stock_entry_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Marquer la sortie comme retournée OK
        const { error: updateError } = await supabase
          .from("stock_exits")
          .update({
            return_status: "retourne_ok",
            actual_return_date: new Date().toISOString(),
          })
          .eq("id", exit.id);

        if (updateError) throw updateError;

        toast({
          title: "✅ Retour enregistré",
          description: "Le stock a été mis à jour automatiquement",
        });
      } else if (scenario === 'damaged') {
        // Scénario 2: Retour endommagé → Pas d'entrée, caution conservée
        const { error } = await supabase
          .from("stock_exits")
          .update({
            return_status: "retourne_endommage",
            actual_return_date: new Date().toISOString(),
            damage_description: damageDescription,
            reimbursement_amount: parseFloat(reimbursementAmount) || 0,
          })
          .eq("id", exit.id);

        if (error) throw error;

        toast({
          title: "⚠️ Retour endommagé enregistré",
          description: `Caution de ${exit.caution_amount || 0}€ conservée`,
        });
      } else {
        // Scénario 3: Non retourné → Aucune action sur le stock
        const { error } = await supabase
          .from("stock_exits")
          .update({
            return_status: "non_retourne",
          })
          .eq("id", exit.id);

        if (error) throw error;

        toast({
          title: "❌ Accessoire non retourné",
          description: "Le stock n'a pas été modifié",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erreur traitement retour:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le retour",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Traiter le retour d'accessoire</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Articles concernés :
            </p>
            <ul className="list-disc list-inside space-y-1">
              {exit.stock_exit_items.map((item, idx) => (
                <li key={idx} className="text-sm">
                  {item.articles.designation} - {item.quantity} unité(s)
                </li>
              ))}
            </ul>
            {exit.caution_amount && (
              <p className="text-sm mt-2">
                <span className="font-semibold">Caution :</span> {exit.caution_amount}€
              </p>
            )}
          </div>

          <div>
            <Label>Scénario de retour</Label>
            <RadioGroup value={scenario} onValueChange={(v) => setScenario(v as ReturnScenario)}>
              <div className="flex items-start space-x-2 border rounded-md p-4 mt-2">
                <RadioGroupItem value="ok" id="ok" />
                <div className="flex-1">
                  <Label htmlFor="ok" className="flex items-center gap-2 cursor-pointer">
                    <PackageCheck className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Retour en bon état</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le stock sera automatiquement augmenté. Caution rendue au client.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="damaged" id="damaged" />
                <div className="flex-1">
                  <Label htmlFor="damaged" className="flex items-center gap-2 cursor-pointer">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold">Retour endommagé</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le stock ne sera pas augmenté. Caution conservée. Facturation complémentaire si nécessaire.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="not_returned" id="not_returned" />
                <div className="flex-1">
                  <Label htmlFor="not_returned" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">Non retourné</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'accessoire n'a pas été retourné. Facturation au client. Article à racheter.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {scenario === 'damaged' && (
            <>
              <div>
                <Label htmlFor="damage-description">Description des dommages*</Label>
                <Textarea
                  id="damage-description"
                  placeholder="Ex: Écran fissuré, boîtier cassé, etc."
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="reimbursement">Montant à facturer (€)</Label>
                <Input
                  id="reimbursement"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={reimbursementAmount}
                  onChange={(e) => setReimbursementAmount(e.target.value)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Caution conservée : {exit.caution_amount || 0}€
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Annuler
          </Button>
          <Button onClick={handleReturn} disabled={isProcessing}>
            {isProcessing ? "Traitement..." : "Valider le retour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
