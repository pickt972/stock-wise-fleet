import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Trash2, PackageMinus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ExitDetails } from "./ExitDetails";
import { ExitDeleteDialog } from "./ExitDeleteDialog";

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
  created_at: string;
  created_by: string;
  vehicules?: {
    immatriculation: string;
    marque: string;
    modele: string;
  } | null;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
  stock_exit_items: ExitItem[];
}

interface ExitListProps {
  exits: StockExit[];
  onRefresh: () => void;
}

const getExitTypeBadge = (type: string) => {
  const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    utilisation_vehicule: { label: "Utilisation véhicule", variant: "default" },
    location_accessoire: { label: "Location accessoire", variant: "secondary" },
    consommation: { label: "Consommation", variant: "outline" },
    perte_casse: { label: "Perte/Casse", variant: "destructive" },
    autre: { label: "Autre", variant: "outline" },
  };
  
  const badge = badges[type] || badges.autre;
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
};

const getReturnStatusBadge = (status: string | null) => {
  if (!status) return null;
  
  const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    en_cours: { label: "En location", variant: "secondary" },
    retourne_ok: { label: "Retourné OK", variant: "default" },
    retourne_endommage: { label: "Retourné endommagé", variant: "destructive" },
    non_retourne: { label: "Non retourné", variant: "destructive" },
  };
  
  const badge = badges[status];
  if (!badge) return null;
  
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
};

const canDeleteExit = (exitDate: string, isAdmin: boolean) => {
  if (!isAdmin) return false;
  const daysDiff = (Date.now() - new Date(exitDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

const isReturnOverdue = (expectedReturnDate: string | null, returnStatus: string | null) => {
  if (!expectedReturnDate || returnStatus !== 'en_cours') return false;
  return new Date(expectedReturnDate) < new Date();
};

export function ExitList({ exits, onRefresh }: ExitListProps) {
  const { isAdmin } = useRoleAccess();
  const [selectedExit, setSelectedExit] = useState<StockExit | null>(null);
  const [deleteExit, setDeleteExit] = useState<StockExit | null>(null);

  if (exits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <PackageMinus className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune sortie de stock</h3>
          <p className="text-muted-foreground text-center">
            Commencez par créer une nouvelle sortie de stock
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Sortie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Véhicule/Client</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exits.map((exit) => {
              const isDeletable = canDeleteExit(exit.created_at, isAdmin());
              const isDeleted = exit.status === 'deleted';
              const overdue = isReturnOverdue(exit.expected_return_date, exit.return_status);

              return (
                <TableRow key={exit.id} className={isDeleted ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-sm">
                    {exit.exit_number}
                    {overdue && (
                      <AlertCircle className="inline-block ml-2 h-4 w-4 text-destructive" />
                    )}
                    {isDeleted && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        SUPPRIMÉ
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(exit.exit_date), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>{getExitTypeBadge(exit.exit_type)}</TableCell>
                  <TableCell>
                    {exit.vehicules?.immatriculation || "-"}
                  </TableCell>
                  <TableCell>
                    {exit.stock_exit_items.length} article{exit.stock_exit_items.length > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    {getReturnStatusBadge(exit.return_status)}
                  </TableCell>
                  <TableCell>
                    {exit.profiles?.first_name && exit.profiles?.last_name
                      ? `${exit.profiles.first_name} ${exit.profiles.last_name}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExit(exit)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isDeleted && isDeletable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteExit(exit)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedExit && (
        <ExitDetails
          exit={selectedExit}
          open={!!selectedExit}
          onOpenChange={(open) => !open && setSelectedExit(null)}
          onRefresh={onRefresh}
        />
      )}

      {deleteExit && (
        <ExitDeleteDialog
          exit={deleteExit}
          open={!!deleteExit}
          onOpenChange={(open) => !open && setDeleteExit(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
