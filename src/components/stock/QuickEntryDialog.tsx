import { useState, useEffect } from "react";
import { Minus, Plus, PackagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface QuickEntryArticle {
  id: string;
  reference: string;
  designation: string;
  stock: number;
}

interface QuickEntryDialogProps {
  article: QuickEntryArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function QuickEntryDialog({ article, open, onOpenChange, onDone }: QuickEntryDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setQuantity(1);
  }, [open, article?.id]);

  const handleConfirm = async () => {
    if (!article) return;
    if (quantity <= 0) {
      toast({ title: "Quantité invalide", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Insérer dans stock_entries — le trigger increase_stock_on_entry
      // incrémente automatiquement articles.stock et crée le mouvement historique.
      const { data: entry, error: entryError } = await supabase
        .from("stock_entries")
        .insert([{
          entry_number: "",          // trigger génère ENT-YYYY-XXXXXX
          entry_type: "achat",
          notes: "Entrée rapide (scan)",
          created_by: user?.id,
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      const { error: itemError } = await supabase
        .from("stock_entry_items")
        .insert([{
          entry_id: entry.id,
          article_id: article.id,
          quantity,
          prix_unitaire: null,       // prix non renseigné en mode rapide
        }]);

      if (itemError) throw itemError;

      toast({
        title: "✅ Entrée enregistrée",
        description: `${quantity} × ${article.designation} — N° ${entry.entry_number || "—"}`,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      // Si le trigger n'existe pas encore, fallback sur update_article_stock RPC
      if (e.message?.includes("entry_number") || e.message?.includes("column")) {
        try {
          const { error: rpcError } = await supabase.rpc("update_article_stock", {
            article_id: article.id,
            quantity_change: quantity,
          });
          if (rpcError) throw rpcError;
          toast({
            title: "✅ Stock mis à jour",
            description: `+${quantity} × ${article.designation}`,
          });
          onOpenChange(false);
          onDone?.();
        } catch (rpcErr: any) {
          toast({
            title: "Erreur",
            description: rpcErr.message || "Impossible d'enregistrer l'entrée",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erreur",
          description: e.message || "Impossible d'enregistrer l'entrée",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-success" />
            Entrée rapide
          </DialogTitle>
        </DialogHeader>

        {article && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-semibold text-base truncate">{article.designation}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {article.reference} · stock actuel :{" "}
                <span className="font-semibold text-foreground">{article.stock}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité à ajouter</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={submitting}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-14 text-center text-2xl font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={submitting}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Quick quantity buttons */}
              <div className="flex justify-center gap-2 pt-1">
                {[1, 2, 5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={quantity === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(n)}
                    className="min-w-[40px]"
                  >
                    {n}
                  </Button>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground pt-1">
                Stock après entrée :{" "}
                <span className="font-semibold text-foreground">{article.stock + quantity}</span>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="sm:w-auto w-full"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !article}
            className="sm:w-auto w-full h-14 sm:h-10 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground"
          >
            {submitting ? "Enregistrement..." : `Confirmer entrée (+${quantity})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
