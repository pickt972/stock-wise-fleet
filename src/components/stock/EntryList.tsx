import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Trash2, Package, TrendingUp } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { EntryDetails } from "./EntryDetails";
import { EntryDeleteDialog } from "./EntryDeleteDialog";

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
  created_at: string;
  created_by: string;
  fournisseurs?: {
    nom: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
  stock_entry_items: EntryItem[];
}

interface EntryListProps {
  entries: StockEntry[];
  onRefresh: () => void;
}

const getEntryTypeBadge = (type: string) => {
  const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    achat: { label: "Achat", variant: "default" },
    retour: { label: "Retour client", variant: "secondary" },
    transfert: { label: "Transfert", variant: "outline" },
    ajustement: { label: "Ajustement", variant: "secondary" },
    reparation: { label: "Réparation", variant: "outline" },
    autre: { label: "Autre", variant: "outline" },
  };
  
  const badge = badges[type] || badges.autre;
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
};

const canDeleteEntry = (entryDate: string, isAdmin: boolean) => {
  if (!isAdmin) return false;
  const daysDiff = (Date.now() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

export function EntryList({ entries, onRefresh }: EntryListProps) {
  const { isAdmin } = useRoleAccess();
  const [selectedEntry, setSelectedEntry] = useState<StockEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<StockEntry | null>(null);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune entrée de stock</h3>
          <p className="text-muted-foreground text-center">
            Commencez par créer une nouvelle entrée de stock
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
              <TableHead>N° Entrée</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead className="text-right">Montant total</TableHead>
              <TableHead>Créé par</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isDeletable = canDeleteEntry(entry.created_at, isAdmin());
              const isRecent = (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60) < 24;
              const isDeleted = entry.status === 'deleted';

              return (
                <TableRow key={entry.id} className={isDeleted ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-sm">
                    {entry.entry_number}
                    {isRecent && !isDeleted && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        NOUVEAU
                      </Badge>
                    )}
                    {isDeleted && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        SUPPRIMÉ
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>{getEntryTypeBadge(entry.entry_type)}</TableCell>
                  <TableCell>
                    {entry.fournisseurs?.nom || "-"}
                  </TableCell>
                  <TableCell>
                    {entry.stock_entry_items.length} article{entry.stock_entry_items.length > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(entry.total_amount)}
                  </TableCell>
                  <TableCell>
                    {entry.profiles.first_name} {entry.profiles.last_name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isDeleted && isDeletable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteEntry(entry)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {!isDeleted && !isDeletable && isAdmin() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Impossible de supprimer : entrée de plus de 7 jours"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
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

      {selectedEntry && (
        <EntryDetails
          entry={selectedEntry}
          open={!!selectedEntry}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
        />
      )}

      {deleteEntry && (
        <EntryDeleteDialog
          entry={deleteEntry}
          open={!!deleteEntry}
          onOpenChange={(open) => !open && setDeleteEntry(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
