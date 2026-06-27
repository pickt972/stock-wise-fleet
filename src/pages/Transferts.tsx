import { useState, useEffect, useMemo } from "react";
import { ArrowLeftRight, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TransfertEmplacementDialog } from "@/components/transferts/TransfertEmplacementDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DashboardLayout from "./DashboardLayout";
import { EmptyState } from "@/components/ui/empty-state";

interface TransfertMovement {
  id: string;
  article_id: string;
  type: string;
  motif: string;
  quantity: number;
  created_at: string;
  created_by: string | null;
  articles?: {
    reference: string;
    designation: string;
    marque: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

const ITEMS_PER_PAGE = 15;

export default function Transferts() {
  const { toast } = useToast();
  const [movements, setMovements] = useState<TransfertMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransferts();
  }, [currentPage]);

  const fetchTransferts = async () => {
    setIsLoading(true);
    try {
      // Count total transferts
      const { count, error: countError } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true })
        .like("motif", "Transfert%");

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch page
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id, article_id, type, motif, quantity, created_at, created_by,
          articles(reference, designation, marque)
        `)
        .like("motif", "Transfert%")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error("Erreur chargement transferts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transferts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    if (!searchTerm) return movements;
    const lower = searchTerm.toLowerCase();
    return movements.filter(
      (m) =>
        m.articles?.reference?.toLowerCase().includes(lower) ||
        m.articles?.designation?.toLowerCase().includes(lower) ||
        m.motif.toLowerCase().includes(lower)
    );
  }, [movements, searchTerm]);

  // Group sortie+entree pairs for display
  const groupedTransferts = useMemo(() => {
    const sorties = filteredMovements.filter((m) => m.type === "sortie");
    const entrees = filteredMovements.filter((m) => m.type === "entree");

    // Show sorties as primary rows (each transfert creates a sortie + entree)
    return sorties.map((sortie) => {
      const matchingEntree = entrees.find(
        (e) =>
          e.article_id === sortie.article_id &&
          e.quantity === sortie.quantity &&
          Math.abs(new Date(e.created_at).getTime() - new Date(sortie.created_at).getTime()) < 5000
      );
      return {
        ...sortie,
        destination: matchingEntree?.motif?.replace("Transfert depuis ", "") || "",
        source: sortie.motif?.replace("Transfert vers ", "") || "",
      };
    });
  }, [filteredMovements]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE / 2) || 1; // /2 because each transfert = 2 movements

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: Math.ceil(totalCount / 2),
      today: groupedTransferts.filter((t) => new Date(t.created_at) >= today).length,
      month: groupedTransferts.filter((t) => new Date(t.created_at) >= firstOfMonth).length,
    };
  }, [totalCount, groupedTransferts]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader title="Transferts de stock" />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau transfert
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total transferts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.month}</div>
              <p className="text-xs text-muted-foreground">Ce mois-ci</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un transfert..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="h-4 w-4" />
              Historique des transferts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : groupedTransferts.length === 0 ? (
              <EmptyState
                icon={<ArrowLeftRight className="h-8 w-8" />}
                title="Aucun transfert"
                description="Les transferts entre sites apparaîtront ici."
                action={{ label: "Nouveau transfert", onClick: () => setDialogOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {groupedTransferts.map((transfert) => (
                  <div
                    key={transfert.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {transfert.articles?.designation || "Article inconnu"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Réf: {transfert.articles?.reference} — {transfert.articles?.marque}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {transfert.source}
                        </Badge>
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {transfert.destination}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge>{transfert.quantity} unité(s)</Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(transfert.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <TransfertEmplacementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onTransfertCompleted={() => {
            fetchTransferts();
            setDialogOpen(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
