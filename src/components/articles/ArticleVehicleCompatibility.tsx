import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Car, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Vehicule = Tables<"vehicules">;
type ArticleVehicule = Tables<"article_vehicules">;

interface ArticleVehicleCompatibilityProps {
  articleId: string;
}

export default function ArticleVehicleCompatibility({ articleId }: ArticleVehicleCompatibilityProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVehiculeId, setSelectedVehiculeId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("marque", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: compatibilities = [] } = useQuery({
    queryKey: ["article-vehicules", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_vehicules")
        .select(`
          id,
          notes,
          vehicule_id,
          vehicules (
            id,
            marque,
            modele,
            motorisation,
            immatriculation
          )
        `)
        .eq("article_id", articleId);
      
      if (error) throw error;
      return data;
    },
  });

  const addCompatibilityMutation = useMutation({
    mutationFn: async ({ vehiculeId, notes }: { vehiculeId: string; notes: string }) => {
      const { error } = await supabase
        .from("article_vehicules")
        .insert({
          article_id: articleId,
          vehicule_id: vehiculeId,
          notes: notes || null,
          user_id: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité ajoutée avec succès");
      setSelectedVehiculeId("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const removeCompatibilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("article_vehicules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité supprimée avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  const handleAddCompatibility = () => {
    if (!selectedVehiculeId) {
      toast.error("Veuillez sélectionner un véhicule");
      return;
    }

    // Vérifier si la compatibilité existe déjà
    const exists = compatibilities.some(
      (comp) => comp.vehicule_id === selectedVehiculeId
    );

    if (exists) {
      toast.error("Ce véhicule est déjà associé à cet article");
      return;
    }

    addCompatibilityMutation.mutate({ vehiculeId: selectedVehiculeId, notes });
  };

  const availableVehicules = vehicules.filter(
    (vehicule) => !compatibilities.some((comp) => comp.vehicule_id === vehicule.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Compatibilité Véhicules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="vehicule-select">Ajouter un véhicule compatible</Label>
            <Select value={selectedVehiculeId} onValueChange={setSelectedVehiculeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicules.map((vehicule) => (
                  <SelectItem key={vehicule.id} value={vehicule.id}>
                    {vehicule.marque} {vehicule.modele} 
                    {vehicule.motorisation && ` (${vehicule.motorisation})`} 
                    - {vehicule.immatriculation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations spécifiques à cette compatibilité..."
              rows={2}
            />
          </div>

          <Button 
            onClick={handleAddCompatibility}
            disabled={!selectedVehiculeId || addCompatibilityMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter la compatibilité
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Véhicules compatibles :</h4>
          {compatibilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune compatibilité définie pour cet article
            </p>
          ) : (
            <div className="space-y-2">
              {compatibilities.map((compatibility) => (
                <div key={compatibility.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {compatibility.vehicules?.marque} {compatibility.vehicules?.modele}
                        {compatibility.vehicules?.motorisation && ` (${compatibility.vehicules?.motorisation})`}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {compatibility.vehicules?.immatriculation}
                      </span>
                    </div>
                    {compatibility.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {compatibility.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompatibilityMutation.mutate(compatibility.id)}
                    disabled={removeCompatibilityMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}