import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EntryItem {
  id: string;
  article_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  articles: {
    reference: string;
    designation: string;
  };
}

interface StockEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  total_amount: number;
  status: string;
  invoice_number?: string;
  location?: string;
  notes?: string;
  created_at: string;
  fournisseurs?: {
    nom: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
  stock_entry_items: EntryItem[];
}

interface EntryDetailsProps {
  entry: StockEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getEntryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    achat: "Achat fournisseur",
    retour: "Retour client",
    transfert: "Transfert entre sites",
    ajustement: "Ajustement inventaire",
    reparation: "Réparation terminée",
    autre: "Autre",
  };
  return labels[type] || type;
};

export function EntryDetails({ entry, open, onOpenChange }: EntryDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de l'entrée de stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* En-tête */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">N° d'entrée</p>
              <p className="font-mono font-semibold">{entry.entry_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">
                {format(new Date(entry.entry_date), "dd/MM/yyyy 'à' HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-semibold">{getEntryTypeLabel(entry.entry_type)}</p>
            </div>
            {entry.fournisseurs && (
              <div>
                <p className="text-sm text-muted-foreground">Fournisseur</p>
                <p className="font-semibold">{entry.fournisseurs.nom}</p>
              </div>
            )}
            {entry.invoice_number && (
              <div>
                <p className="text-sm text-muted-foreground">N° Facture/BL</p>
                <p className="font-semibold">{entry.invoice_number}</p>
              </div>
            )}
            {entry.location && (
              <div>
                <p className="text-sm text-muted-foreground">Emplacement</p>
                <p className="font-semibold">{entry.location}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Articles */}
          <div>
            <h3 className="font-semibold mb-4">Articles entrés</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.stock_entry_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.articles.reference}
                      </TableCell>
                      <TableCell>{item.articles.designation}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">MONTANT TOTAL</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(entry.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {entry.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Créé par</p>
              <p>
                {entry.profiles.first_name} {entry.profiles.last_name}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Créé le</p>
              <p>
                {format(new Date(entry.created_at), "dd/MM/yyyy 'à' HH:mm:ss", {
                  locale: fr,
                })}
              </p>
            </div>
          </div>

          {entry.status === 'deleted' && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <Badge variant="destructive" className="mb-2">
                ENTRÉE SUPPRIMÉE
              </Badge>
              <p className="text-sm">
                Cette entrée a été supprimée. Les stocks ont été ajustés en conséquence.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
