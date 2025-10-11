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
import { Car, Plus, Edit, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import type { Tables } from "@/integrations/supabase/types";

type Vehicule = Tables<"vehicules">;
type Article = Tables<"articles">;

export default function Vehicules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null);
  const [viewingVehiculeId, setViewingVehiculeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    motorisation: "",
    immatriculation: "",
    annee: "",
    notes: "",
    actif: true,
  });


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
        .select(`
          *,
          article_vehicules!inner (
            notes,
            vehicule_id
          )
        `)
        .eq("article_vehicules.vehicule_id", viewingVehiculeId);
      
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!viewingVehiculeId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("vehicules")
        .insert({
          ...data,
          annee: data.annee ? parseInt(data.annee) : null,
          user_id: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule créé avec succès");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erreur lors de la création : " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("vehicules")
        .update({
          ...data,
          annee: data.annee ? parseInt(data.annee) : null,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule modifié avec succès");
      setEditingVehicule(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erreur lors de la modification : " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicules"] });
      toast.success("Véhicule supprimé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      marque: "",
      modele: "",
      motorisation: "",
      immatriculation: "",
      annee: "",
      notes: "",
      actif: true,
    });
  };

  const handleEdit = (vehicule: Vehicule) => {
    setEditingVehicule(vehicule);
    setFormData({
      marque: vehicule.marque,
      modele: vehicule.modele,
      motorisation: vehicule.motorisation || "",
      immatriculation: vehicule.immatriculation,
      annee: vehicule.annee?.toString() || "",
      notes: vehicule.notes || "",
      actif: vehicule.actif,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingVehicule) {
      updateMutation.mutate({ id: editingVehicule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Gestion des Véhicules</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un véhicule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVehicule ? "Modifier le véhicule" : "Ajouter un nouveau véhicule"}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicule ? "Modifiez les informations du véhicule" : "Ajoutez un nouveau véhicule à votre parc"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marque">Marque *</Label>
                    <Input
                      id="marque"
                      value={formData.marque}
                      onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                      placeholder="Peugeot, Renault..."
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="modele">Modèle *</Label>
                    <Input
                      id="modele"
                      value={formData.modele}
                      onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                      placeholder="208, Clio..."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="motorisation">Motorisation</Label>
                    <Input
                      id="motorisation"
                      value={formData.motorisation}
                      onChange={(e) => setFormData(prev => ({ ...prev, motorisation: e.target.value }))}
                      placeholder="Essence, Diesel, Électrique..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="annee">Année</Label>
                    <Input
                      id="annee"
                      type="number"
                      value={formData.annee}
                      onChange={(e) => setFormData(prev => ({ ...prev, annee: e.target.value }))}
                      placeholder="2020"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="immatriculation">Immatriculation *</Label>
                  <Input
                    id="immatriculation"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData(prev => ({ ...prev, immatriculation: e.target.value }))}
                    placeholder="AB-123-CD"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informations complémentaires..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="actif"
                    checked={formData.actif}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
                  />
                  <Label htmlFor="actif">Véhicule actif</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingVehicule(null);
                      resetForm();
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingVehicule ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingVehiculeId(vehicule.id)}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleEdit(vehicule);
                            setIsCreateOpen(true);
                          }}
                        >
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
              <div className="text-center py-8 text-muted-foreground">
                Aucun véhicule enregistré
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog pour voir les pièces compatibles */}
      <Dialog open={!!viewingVehiculeId} onOpenChange={(open) => !open && setViewingVehiculeId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Pièces compatibles</DialogTitle>
            <DialogDescription>
              {viewingVehiculeId && (() => {
                const vehicule = vehicules.find(v => v.id === viewingVehiculeId);
                return vehicule ? `${vehicule.marque} ${vehicule.modele} ${vehicule.motorisation ? `(${vehicule.motorisation})` : ''} - ${vehicule.immatriculation}` : '';
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