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

interface DraftOrder {
  id: string;
  numero_commande: string;
  fournisseur: string;
  total_ht: number;
  items: any[];
}

interface DraftOrderCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  draftOrder: DraftOrder | null;
  onAddToExisting: () => void;
  onCreateNew: () => void;
}

export const DraftOrderCheckDialog = ({
  isOpen,
  onClose,
  draftOrder,
  onAddToExisting,
  onCreateNew,
}: DraftOrderCheckDialogProps) => {
  if (!draftOrder) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Commande en brouillon existante</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Une commande en brouillon existe déjà pour le fournisseur{" "}
              <span className="font-semibold">{draftOrder.fournisseur}</span>.
            </p>
            <div className="bg-muted p-3 rounded-md text-sm">
              <div className="font-medium mb-1">
                {draftOrder.numero_commande || "Brouillon"}
              </div>
              <div className="text-muted-foreground">
                {draftOrder.items.length} article(s) • {draftOrder.total_ht.toFixed(2)} € HT
              </div>
            </div>
            <p className="text-foreground">
              Voulez-vous ajouter le(s) nouvel(aux) article(s) à cette commande existante ou créer une nouvelle commande ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCreateNew}>
            Créer une nouvelle commande
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAddToExisting}>
            Ajouter à la commande existante
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
