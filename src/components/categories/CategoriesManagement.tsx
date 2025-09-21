import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CompactSortControls } from "@/components/ui/compact-sort-controls";
import { DragHandle } from "@/components/ui/drag-handle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorSelector } from "@/components/ui/color-selector";
import { useColorPreferences } from "@/hooks/useColorPreferences";

interface Categorie {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingCategorie, setEditingCategorie] = useState<Categorie | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  const [currentSort, setCurrentSort] = useState('nom');
  const [currentDirection, setCurrentDirection] = useState<'asc' | 'desc'>('asc');

  const { toast } = useToast();
  const { getColorForText } = useColorPreferences();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nom');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sortOptions = [
    { value: 'nom', label: 'Nom' },
    { value: 'created_at', label: 'Date de création' },
    { value: 'updated_at', label: 'Date de modification' },
    { value: 'actif', label: 'Statut' }
  ];

  const applySorting = (data: Categorie[]) => {
    return [...data].sort((a, b) => {
      let aValue = a[currentSort as keyof Categorie];
      let bValue = b[currentSort as keyof Categorie];

      if (currentSort === 'actif') {
        aValue = a.actif ? '1' : '0';
        bValue = b.actif ? '1' : '0';
      }

      if (aValue === bValue) return 0;
      const result = aValue < bValue ? -1 : 1;
      return currentDirection === 'asc' ? result : -result;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setCurrentSort(field);
    setCurrentDirection(direction);
  };

  const displayedCategories = currentSort === 'manual' ? categories : applySorting(categories);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          nom: formData.nom,
          description: formData.description || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });

      setFormData({ nom: "", description: "" });
      setOpenCreateDialog(false);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategorie) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          nom: formData.nom,
          description: formData.description || null,
        })
        .eq('id', editingCategorie.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie modifiée avec succès",
      });

      setFormData({ nom: "", description: "" });
      setOpenEditDialog(false);
      setEditingCategorie(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ actif: false })
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (categorie: Categorie) => {
    setEditingCategorie(categorie);
    setFormData({
      nom: categorie.nom,
      description: categorie.description || "",
    });
    setOpenEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Chargement des catégories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CompactSortControls
          sortOptions={[{ value: 'manual', label: 'Manuel' }, ...sortOptions]}
          currentSort={currentSort}
          currentDirection={currentDirection}
          onSortChange={handleSortChange}
          showDragHandle={currentSort === 'manual'}
        />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des catégories</CardTitle>
            <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle catégorie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom de la catégorie *</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  {formData.nom && (
                    <ColorSelector 
                      type="category" 
                      name={formData.nom}
                      label="Couleur d'affichage"
                    />
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Créer</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {currentSort === 'manual' && <TableHead className="w-12"></TableHead>}
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext items={displayedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {displayedCategories.map((categorie) => (
                    <TableRow key={categorie.id}>
                      {currentSort === 'manual' ? (
                        <DragHandle id={categorie.id}>
                          <>
                            <TableCell></TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={`${getColorForText(categorie.nom, 'category')}`}
                              >
                                {categorie.nom}
                              </Badge>
                            </TableCell>
                            <TableCell>{categorie.description || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={categorie.actif ? "default" : "secondary"}>
                                {categorie.actif ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditForm(categorie)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer la catégorie "{categorie.nom}" ?
                                        Cette action ne supprimera pas définitivement la catégorie mais la désactivera.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(categorie.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </>
                        </DragHandle>
                      ) : (
                        <>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={`${getColorForText(categorie.nom, 'category')}`}
                            >
                              {categorie.nom}
                            </Badge>
                          </TableCell>
                          <TableCell>{categorie.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={categorie.actif ? "default" : "secondary"}>
                              {categorie.actif ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditForm(categorie)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer la catégorie "{categorie.nom}" ?
                                      Cette action ne supprimera pas définitivement la catégorie mais la désactivera.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(categorie.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>

          {/* Dialog d'édition */}
          <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la catégorie</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nom">Nom de la catégorie *</Label>
                  <Input
                    id="edit-nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    />
                  </div>
                  
                  {editingCategorie && (
                    <ColorSelector 
                      type="category" 
                      name={editingCategorie.nom}
                      label="Couleur d'affichage"
                    />
                  )}
                  
                  <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Modifier</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}