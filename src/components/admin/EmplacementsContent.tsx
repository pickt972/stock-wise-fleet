import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ColorSelector } from "@/components/ui/color-selector";
import { useColorPreferences } from "@/hooks/useColorPreferences";

interface Emplacement {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export function EmplacementsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmplacement, setSelectedEmplacement] = useState<Emplacement | null>(null);
  const [formData, setFormData] = useState({ nom: "", description: "", actif: true });
  const { getColorForText } = useColorPreferences();

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('emplacements')
        .select('*')
        .order('nom');

      if (error) throw error;
      setEmplacements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emplacements:', error);
      toast.error("Erreur lors du chargement des emplacements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmplacements();
  }, []);

  const handleCreateEmplacement = async () => {
    try {
      const { error } = await supabase
        .from('emplacements')
        .insert([formData]);

      if (error) throw error;

      toast.success("Emplacement créé avec succès");
      setIsCreateDialogOpen(false);
      setFormData({ nom: "", description: "", actif: true });
      fetchEmplacements();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error("Erreur lors de la création de l'emplacement");
    }
  };

  const handleEditEmplacement = async () => {
    if (!selectedEmplacement) return;

    try {
      const { error } = await supabase
        .from('emplacements')
        .update(formData)
        .eq('id', selectedEmplacement.id);

      if (error) throw error;

      toast.success("Emplacement modifié avec succès");
      setIsEditDialogOpen(false);
      setSelectedEmplacement(null);
      setFormData({ nom: "", description: "", actif: true });
      fetchEmplacements();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error("Erreur lors de la modification de l'emplacement");
    }
  };

  const handleDeleteEmplacement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emplacements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Emplacement supprimé avec succès");
      fetchEmplacements();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error("Erreur lors de la suppression de l'emplacement");
    }
  };

  const openEditDialog = (emplacement: Emplacement) => {
    setSelectedEmplacement(emplacement);
    setFormData({
      nom: emplacement.nom,
      description: emplacement.description || "",
      actif: emplacement.actif
    });
    setIsEditDialogOpen(true);
  };

  const filteredEmplacements = emplacements.filter(emplacement =>
    emplacement.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emplacement.description && emplacement.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div>Chargement des emplacements...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des emplacements</CardTitle>
        <CardDescription>Gérez les emplacements de stockage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un emplacement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel emplacement
          </Button>
        </div>

        <div className="space-y-2">
          {filteredEmplacements.map((emplacement) => (
            <div key={emplacement.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ColorSelector
                  type="location"
                  name={emplacement.nom}
                />
                <div>
                  <h3 className="font-medium">{emplacement.nom}</h3>
                  {emplacement.description && (
                    <p className="text-sm text-muted-foreground">{emplacement.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Statut: {emplacement.actif ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(emplacement)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer l'emplacement</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer l'emplacement "{emplacement.nom}" ?
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteEmplacement(emplacement.id)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouvel emplacement</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel emplacement de stockage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Nom de l'emplacement"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description (optionnel)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="actif"
                  checked={formData.actif}
                  onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
                />
                <Label htmlFor="actif">Emplacement actif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateEmplacement}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'emplacement</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'emplacement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Nom de l'emplacement"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description (optionnel)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-actif"
                  checked={formData.actif}
                  onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
                />
                <Label htmlFor="edit-actif">Emplacement actif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditEmplacement}>Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}