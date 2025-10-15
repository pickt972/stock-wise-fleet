import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Car, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateVehiculeDialog } from "@/components/vehicules/CreateVehiculeDialog";

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  annee: number | null;
  motorisation: string | null;
  actif: boolean;
  created_at: string;
}

export function VehiculesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicules')
        .select('*')
        .order('marque');

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
      toast.error("Erreur lors du chargement des véhicules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicules();
  }, []);

  const handleDeleteVehicule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Véhicule supprimé avec succès");
      fetchVehicules();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error("Erreur lors de la suppression du véhicule");
    }
  };

  const filteredVehicules = vehicules.filter(vehicule =>
    vehicule.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicule.modele.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicule.immatriculation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div>Chargement des véhicules...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des véhicules</CardTitle>
        <CardDescription>Gérez les véhicules de la flotte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un véhicule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau véhicule
          </Button>
        </div>

        <div className="space-y-2">
          {filteredVehicules.map((vehicule) => (
            <div key={vehicule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{vehicule.marque} {vehicule.modele}</h3>
                  <p className="text-sm text-muted-foreground">{vehicule.immatriculation}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {vehicule.motorisation && <Badge variant="outline">{vehicule.motorisation}</Badge>}
                    {vehicule.annee && <Badge variant="secondary">Année {vehicule.annee}</Badge>}
                    <Badge variant={vehicule.actif ? "default" : "secondary"}>
                      {vehicule.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le véhicule</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer le véhicule "{vehicule.marque} {vehicule.modele}" ?
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteVehicule(vehicule.id)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        <CreateVehiculeDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onVehiculeCreated={fetchVehicules}
        />
      </CardContent>
    </Card>
  );
}