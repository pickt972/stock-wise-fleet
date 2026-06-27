import { useState, useEffect } from "react";
import { Minus, Plus, PackageMinus } from "lucide-react";
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

interface QuickExitArticle {
  id: string;
  reference: string;
  designation: string;
  stock: number;
}

interface QuickExitDialogProps {
  article: QuickExitArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const generateExitNumber = () => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `SRT-${yy}${mm}${dd}-${rand}`;
};

export function QuickExitDialog({ article, open, onOpenChange, onDone }: QuickExitDialogProps) {
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
    if (quantity > article.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Disponible : ${article.stock}`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data: exit, error: exitError } = await supabase
        .from("stock_exits")
        .insert([{
          exit_number: generateExitNumber(),
          exit_type: "consommation",
          notes: "Sortie rapide (scan)",
          created_by: user?.id,
        }])
        .select()
        .single();
      if (exitError) throw exitError;

      const { error: itemError } = await supabase
        .from("stock_exit_items")
        .insert([{
          exit_id: exit.id,
          article_id: article.id,
          quantity,
        }]);
      if (itemError) throw itemError;

      toast({
        title: "✅ Sortie enregistrée",
        description: `${quantity} × ${article.designation}`,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message || "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-destructive" />
            Sortie rapide
          </DialogTitle>
        </DialogHeader>

        {article && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-semibold text-base truncate">{article.designation}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {article.reference} · stock actuel : <span className="font-semibold text-foreground">{article.stock}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité à sortir</label>
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
                  max={article.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-14 text-center text-2xl font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => setQuantity((q) => Math.min(article.stock, q + 1))}
                  disabled={submitting}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
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
            className="sm:w-auto w-full h-14 sm:h-10 text-base font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {submitting ? "Enregistrement..." : `Confirmer sortie (${quantity})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
