import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Car, Plus, Edit, Trash2, Package, Merge } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import type { Tables } from "@/integrations/supabase/types";
import { useVehiculeSuggestions } from "@/hooks/useVehiculeSuggestions";
import { VehiculeWizard } from "@/components/vehicules/VehiculeWizard";
import { MergeVehiculeFieldDialog } from "@/components/vehicules/MergeVehiculeFieldDialog";

type Vehicule = Tables<"vehicules">;
type Article = Tables<"articles">;

export default function Vehicules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: vSuggestions } = useVehiculeSuggestions();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null);
  const [viewingVehiculeId, setViewingVehiculeId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState<null | "marque" | "modele">(null);

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .order("marque", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: compatibleArticles = [] } = useQuery({
    queryKey: ["vehicule-articles", viewingVehiculeId],
    queryFn: async () => {
      if (!viewingVehiculeId) return [];
      const { data, error } = await supabase
        .from("articles")
        .select(`*, article_vehicules!inner ( notes, vehicule_id )`)
        .eq("article_vehicules.vehicule_id", viewingVehiculeId);
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!viewingVehiculeId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule supprimé avec succès");
    },
    onError: (error: any) => toast.error("Erreur lors de la suppression : " + error.message),
  });

  const openCreate = () => {
    setEditingVehicule(null);
    setWizardOpen(true);
  };
  const openEdit = (v: Vehicule) => {
    setEditingVehicule(v);
    setWizardOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Gestion des Véhicules</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMergeOpen("marque")}>
              <Merge className="h-4 w-4 mr-2" /> Fusionner marques
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMergeOpen("modele")}>
              <Merge className="h-4 w-4 mr-2" /> Fusionner modèles
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des véhicules</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marque</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Motorisation</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicules.map((vehicule) => (
                  <TableRow key={vehicule.id}>
                    <TableCell className="font-medium">{vehicule.marque}</TableCell>
                    <TableCell>{vehicule.modele}</TableCell>
                    <TableCell>{vehicule.motorisation || "-"}</TableCell>
                    <TableCell>{vehicule.immatriculation}</TableCell>
                    <TableCell>{vehicule.annee || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={vehicule.actif ? "default" : "secondary"}>
                        {vehicule.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewingVehiculeId(vehicule.id)}>
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(vehicule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(vehicule.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {vehicules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Aucun véhicule enregistré</div>
            )}
          </CardContent>
        </Card>
      </div>

      <VehiculeWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={
          editingVehicule
            ? {
                id: editingVehicule.id,
                marque: editingVehicule.marque,
                modele: editingVehicule.modele,
                motorisation: editingVehicule.motorisation || "",
                immatriculation: editingVehicule.immatriculation,
                annee: editingVehicule.annee?.toString() || "",
                notes: editingVehicule.notes || "",
                actif: editingVehicule.actif,
              }
            : undefined
        }
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["vehicules"] })}
      />

      <MergeVehiculeFieldDialog
        open={mergeOpen !== null}
        onOpenChange={(o) => !o && setMergeOpen(null)}
        field={mergeOpen ?? "marque"}
        values={
          mergeOpen === "modele"
            ? vSuggestions?.modeles ?? []
            : vSuggestions?.marques ?? []
        }
      />

      {/* Dialog pour voir les pièces compatibles */}
      <Dialog open={!!viewingVehiculeId} onOpenChange={(open) => !open && setViewingVehiculeId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Pièces compatibles</DialogTitle>
            <DialogDescription>
              {viewingVehiculeId && (() => {
                const vehicule = vehicules.find((v) => v.id === viewingVehiculeId);
                return vehicule
                  ? `${vehicule.marque} ${vehicule.modele} ${vehicule.motorisation ? `(${vehicule.motorisation})` : ""} - ${vehicule.immatriculation}`
                  : "";
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {compatibleArticles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune pièce compatible enregistrée pour ce véhicule
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Prix d'achat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compatibleArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.reference}</TableCell>
                      <TableCell>{article.designation}</TableCell>
                      <TableCell>{article.marque}</TableCell>
                      <TableCell>
                        <Badge variant={article.stock <= article.stock_min ? "destructive" : "default"}>
                          {article.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>{article.prix_achat.toFixed(2)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}