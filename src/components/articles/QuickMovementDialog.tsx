import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  designation: string;
  reference: string;
  stock: number;
}

interface Props {
  article: Article | null;
  mode: "add" | "remove" | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function QuickMovementDialog({ article, mode, onOpenChange, onDone }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const open = !!article && !!mode;
  const isAdd = mode === "add";

  const handleSubmit = async () => {
    if (!article || !mode) return;
    if (quantity <= 0) return;
    if (mode === "remove" && quantity > article.stock) {
      toast({ title: "Stock insuffisant", description: `Disponible : ${article.stock}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: mvtError } = await supabase.from("stock_movements").insert({
        article_id: article.id,
        type: isAdd ? "entree" : "sortie",
        quantity,
        motif: motif || (isAdd ? "Entrée rapide" : "Sortie rapide"),
        user_id: user.id,
        created_by: user.id,
      });
      if (mvtError) throw mvtError;

      const { error: stockError } = await supabase.rpc("update_article_stock", {
        article_id: article.id,
        quantity_change: isAdd ? quantity : -quantity,
      });
      if (stockError) throw stockError;

      toast({ title: isAdd ? "Entrée enregistrée" : "Sortie enregistrée", description: `${quantity} × ${article.designation}` });
      onDone();
      handleClose();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible d'enregistrer", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setMotif("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdd ? <Plus className="h-5 w-5 text-success" /> : <Minus className="h-5 w-5 text-destructive" />}
            {isAdd ? "Entrée rapide" : "Sortie rapide"}
          </DialogTitle>
        </DialogHeader>
        {article && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="font-medium text-sm truncate">{article.designation}</div>
              <div className="text-xs text-muted-foreground font-mono">{article.reference} · stock {article.stock}</div>
            </div>
            <div className="space-y-2">
              <Label>Quantité</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center text-lg font-semibold"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motif {!isAdd && <span className="text-muted-foreground text-xs">(optionnel)</span>}</Label>
              <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} placeholder="Raison du mouvement..." />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={isAdd ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
          >
            {submitting ? "..." : isAdd ? `Ajouter ${quantity}` : `Retirer ${quantity}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
