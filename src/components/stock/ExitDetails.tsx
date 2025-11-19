import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { AccessoryReturnDialog } from "./AccessoryReturnDialog";

interface ExitItem {
  id: string;
  article_id: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  articles: {
    reference: string;
    designation: string;
  };
}

interface StockExit {
  id: string;
  exit_number: string;
  exit_date: string;
  exit_type: string;
  total_amount: number;
  status: string;
  return_status: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  client_name?: string;
  client_reference?: string;
  intervention_type?: string;
  kilometrage?: number;
  caution_amount?: number;
  damage_description?: string;
  department?: string;
  reason?: string;
  responsible_party?: string;
  reimbursement_amount?: number;
  notes?: string;
  created_at: string;
  vehicules?: {
    immatriculation: string;
    marque: string;
    modele: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
  stock_exit_items: ExitItem[];
}

interface ExitDetailsProps {
  exit: StockExit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const getExitTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    utilisation_vehicule: "Utilisation véhicule",
    location_accessoire: "Location accessoire",
    consommation: "Consommation",
    perte_casse: "Perte/Casse",
    autre: "Autre",
  };
  return labels[type] || type;
};

export function ExitDetails({ exit, open, onOpenChange, onRefresh }: ExitDetailsProps) {
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  
  const canProcessReturn = exit.exit_type === 'location_accessoire' && exit.return_status === 'en_cours';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la sortie de stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* En-tête */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">N° de sortie</p>
                <p className="font-mono font-semibold">{exit.exit_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {format(new Date(exit.exit_date), "dd/MM/yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold">{getExitTypeLabel(exit.exit_type)}</p>
              </div>
              {exit.vehicules && (
                <div>
                  <p className="text-sm text-muted-foreground">Véhicule</p>
                  <p className="font-semibold">
                    {exit.vehicules.marque} {exit.vehicules.modele} - {exit.vehicules.immatriculation}
                  </p>
                </div>
              )}
              {exit.client_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-semibold">{exit.client_name}</p>
                </div>
              )}
              {exit.intervention_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Intervention</p>
                  <p className="font-semibold">{exit.intervention_type}</p>
                </div>
              )}
              {exit.return_status && (
                <div>
                  <p className="text-sm text-muted-foreground">Statut retour</p>
                  <p className="font-semibold capitalize">{exit.return_status.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            {canProcessReturn && (
              <Button onClick={() => setShowReturnDialog(true)} className="w-full">
                Traiter le retour
              </Button>
            )}

            <Separator />

            {/* Articles */}
            <div>
              <h3 className="font-semibold mb-4">Articles sortis</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exit.stock_exit_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.articles.reference}
                        </TableCell>
                        <TableCell>{item.articles.designation}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {exit.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{exit.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Métadonnées */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Créé par</p>
                <p>
                  {exit.profiles.first_name} {exit.profiles.last_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Créé le</p>
                <p>
                  {format(new Date(exit.created_at), "dd/MM/yyyy 'à' HH:mm:ss", {
                    locale: fr,
                  })}
                </p>
              </div>
            </div>

            {exit.status === 'deleted' && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <Badge variant="destructive" className="mb-2">
                  SORTIE SUPPRIMÉE
                </Badge>
                <p className="text-sm">
                  Cette sortie a été supprimée. Les stocks ont été restaurés.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {canProcessReturn && (
        <AccessoryReturnDialog
          exit={exit}
          open={showReturnDialog}
          onOpenChange={setShowReturnDialog}
          onSuccess={() => {
            setShowReturnDialog(false);
            onRefresh();
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
