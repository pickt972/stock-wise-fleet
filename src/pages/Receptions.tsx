import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PackageCheck, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeletons/PageSkeleton";
import { ReceptionCommandeDialog } from "@/components/commandes/ReceptionCommandeDialog";
import DashboardLayout from "./DashboardLayout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CommandeEnAttente {
  id: string;
  numero_commande: string;
  fournisseur: string;
  status: string;
  date_creation: string;
  commande_items: Array<{
    designation: string;
    quantite_commandee: number;
    quantite_recue: number;
  }>;
}

export default function Receptions() {
  const navigate = useNavigate();
  const [receptionDialog, setReceptionDialog] = useState<{ open: boolean; commande: CommandeEnAttente | null }>({ open: false, commande: null });

  const { data: commandes = [], isLoading, refetch } = useQuery({
    queryKey: ["commandes-en-attente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select(`
          id, numero_commande, fournisseur, status, date_creation,
          commande_items (designation, quantite_commandee, quantite_recue)
        `)
        .in("status", ["confirme", "recu_partiel", "envoye"])
        .order("date_creation", { ascending: false });
      if (error) throw error;
      return (data || []) as CommandeEnAttente[];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirme": return <Badge className="bg-blue-100 text-blue-800">Confirmée</Badge>;
      case "envoye": return <Badge className="bg-purple-100 text-purple-800">Envoyée</Badge>;
      case "recu_partiel": return <Badge className="bg-warning text-warning-foreground">Partielle</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRemainingItems = (items: CommandeEnAttente["commande_items"]) =>
    items.reduce((sum, i) => sum + (i.quantite_commandee - i.quantite_recue), 0);

  if (isLoading) return <DashboardLayout><PageSkeleton rows={4} /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <PageHeader
          title="Réceptions en attente"
          subtitle={`${commandes.length} livraison${commandes.length !== 1 ? "s" : ""} à traiter`}
          showBackButton
          onBack={() => navigate("/dashboard")}
        />

        {commandes.length === 0 ? (
          <EmptyState
            icon={<PackageCheck className="h-8 w-8" />}
            title="Aucune réception en attente"
            description="Toutes les commandes ont été reçues. Les nouvelles livraisons apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {commandes.map((cmd) => {
              const remaining = getRemainingItems(cmd.commande_items);
              return (
                <Card key={cmd.id} className="hover:bg-accent/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{cmd.numero_commande}</span>
                          {getStatusBadge(cmd.status)}
                        </div>
                        <p className="font-medium text-sm truncate">{cmd.fournisseur}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(cmd.date_creation), "dd MMM yyyy", { locale: fr })}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          {cmd.commande_items.length} article{cmd.commande_items.length > 1 ? "s" : ""} — {remaining} unité{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setReceptionDialog({ open: true, commande: cmd })}
                        className="shrink-0 gap-2"
                      >
                        <PackageCheck className="h-4 w-4" />
                        Réceptionner
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {receptionDialog.commande && (
          <ReceptionCommandeDialog
            isOpen={receptionDialog.open}
            onClose={() => setReceptionDialog({ open: false, commande: null })}
            commandeId={receptionDialog.commande.id}
            commandeNumero={receptionDialog.commande.numero_commande}
            onSuccess={() => {
              setReceptionDialog({ open: false, commande: null });
              refetch();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
