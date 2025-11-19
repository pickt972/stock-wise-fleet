import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ExitItem {
  articles: {
    designation: string;
  };
  quantity: number;
}

interface StockExit {
  id: string;
  exit_number: string;
  stock_exit_items: ExitItem[];
}

interface ExitDeleteDialogProps {
  exit: StockExit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExitDeleteDialog({
  exit,
  open,
  onOpenChange,
  onSuccess,
}: ExitDeleteDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez indiquer la raison de la suppression",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Soft delete: marquer comme supprimé
      const { error } = await supabase
        .from("stock_exits")
        .update({
          status: "deleted",
          deleted_reason: deleteReason,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq("id", exit.id);

      if (error) throw error;

      toast({
        title: "✅ Sortie supprimée",
        description: "Le stock a été restauré",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la sortie",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            SUPPRESSION D'UNE SORTIE DE STOCK
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              <p className="font-semibold mb-2">
                Vous êtes sur le point de supprimer cette sortie :
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p>
                  <span className="font-semibold">N° de sortie :</span>{" "}
                  {exit.exit_number}
                </p>
                <p className="font-semibold mt-2">Articles concernés :</p>
                <ul className="list-disc list-inside ml-2">
                  {exit.stock_exit_items.map((item, idx) => (
                    <li key={idx}>
                      {item.articles.designation} : +{item.quantity} unités (restauration)
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive rounded-md p-3 space-y-2">
              <p className="font-semibold text-destructive">⚠️ CONSÉQUENCES :</p>
              <ul className="text-sm space-y-1">
                <li>✓ Le stock des articles sera AUGMENTÉ automatiquement (restauration)</li>
                <li>✓ Cette action est irréversible</li>
                <li>✓ L'historique sera conservé avec mention "SUPPRIMÉ"</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-reason" className="text-foreground">
                Raison de la suppression* (obligatoire)
              </Label>
              <Textarea
                id="delete-reason"
                placeholder="Ex: Erreur de saisie, doublon, etc."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !deleteReason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Suppression..." : "Confirmer la suppression"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
