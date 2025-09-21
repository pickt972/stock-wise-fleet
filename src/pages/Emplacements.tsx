import { useState, useEffect } from "react";
import { Search, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "./DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

export default function Emplacements() {
  const [searchTerm, setSearchTerm] = useState("");
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingEmplacementId, setDeletingEmplacementId] = useState<string | null>(null);
  const [selectedEmplacement, setSelectedEmplacement] = useState<Emplacement | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    actif: true,
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { getColorForText } = useColorPreferences();

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('emplacements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmplacements(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les emplacements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmplacements();
  }, []);

  const handleCreateEmplacement = async () => {
    if (!formData.nom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'emplacement est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('emplacements')
        .insert([{
          ...formData,
          user_id: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emplacement créé avec succès",
      });

      setFormData({ nom: "", description: "", actif: true });
      setIsCreateDialogOpen(false);
      fetchEmplacements();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'emplacement",
        variant: "destructive",
      });
    }
  };

  const handleEditEmplacement = async () => {
    if (!selectedEmplacement || !formData.nom.trim()) return;

    try {
      const { error } = await supabase
        .from('emplacements')
        .update(formData)
        .eq('id', selectedEmplacement.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emplacement modifié avec succès",
      });

      setIsEditDialogOpen(false);
      setSelectedEmplacement(null);
      fetchEmplacements();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'emplacement",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmplacement = async (emplacementId: string) => {
    try {
      const { error } = await supabase
        .from('emplacements')
        .delete()
        .eq('id', emplacementId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Emplacement supprimé avec succès",
      });
      
      fetchEmplacements();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'emplacement",
        variant: "destructive",
      });
    } finally {
      setDeletingEmplacementId(null);
    }
  };

  const openEditDialog = (emplacement: Emplacement) => {
    setSelectedEmplacement(emplacement);
    setFormData({
      nom: emplacement.nom,
      description: emplacement.description || "",
      actif: emplacement.actif,
    });
    setIsEditDialogOpen(true);
  };

  const filteredEmplacements = emplacements.filter(emplacement =>
    emplacement.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emplacement.description && emplacement.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement des emplacements...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Emplacements</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Gérez les emplacements de stockage</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel emplacement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel emplacement</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouvel emplacement de stockage à votre inventaire.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'emplacement *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Ex: Entrepôt A, Rayon 1, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description optionnelle de l'emplacement"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="actif"
                    checked={formData.actif}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
                  />
                  <Label htmlFor="actif">Emplacement actif</Label>
                </div>
                
                {formData.nom && (
                  <ColorSelector 
                    type="location" 
                    name={formData.nom}
                    label="Couleur d'affichage"
                  />
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateEmplacement}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un emplacement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle>Liste des emplacements ({filteredEmplacements.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 sm:w-40">Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-20">Statut</TableHead>
                    <TableHead className="hidden lg:table-cell w-32">Date de création</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmplacements.length > 0 ? (
                    filteredEmplacements.map((emplacement) => (
                       <TableRow key={emplacement.id}>
                         <TableCell className="font-medium text-xs md:text-sm">
                           <Badge 
                             variant="outline"
                             className={`${getColorForText(emplacement.nom, 'location')}`}
                           >
                             📍 {emplacement.nom}
                           </Badge>
                         </TableCell>
                        <TableCell className="hidden md:table-cell text-xs md:text-sm max-w-48 truncate">
                          {emplacement.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emplacement.actif ? "default" : "secondary"}>
                            {emplacement.actif ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(emplacement.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(emplacement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingEmplacementId(emplacement.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer l'emplacement "{emplacement.nom}" ? 
                                    Cette action ne peut pas être annulée.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeletingEmplacementId(null)}>
                                    Annuler
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEmplacement(emplacement.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "Aucun emplacement trouvé pour cette recherche" : "Aucun emplacement trouvé"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog d'édition */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'emplacement</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'emplacement.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom de l'emplacement *</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Entrepôt A, Rayon 1, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description optionnelle de l'emplacement"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-actif"
                  checked={formData.actif}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
                />
                <Label htmlFor="edit-actif">Emplacement actif</Label>
                </div>
                
                {selectedEmplacement && (
                  <ColorSelector 
                    type="location" 
                    name={selectedEmplacement.nom}
                    label="Couleur d'affichage"
                  />
                )}
              </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditEmplacement}>
                Modifier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}