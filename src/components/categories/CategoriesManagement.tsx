import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card } from "@/components/ui/card";
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
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingCategorie, setEditingCategorie] = useState<Categorie | null>(null);
  const [formData, setFormData] = useState({ nom: "", description: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();
  const { getColorForText } = useColorPreferences();

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nom');
      if (error) throw error;
      setCategories(data || []);

      // Fetch article counts per category
      const { data: articles } = await supabase
        .from('articles')
        .select('categorie');
      if (articles) {
        const counts: Record<string, number> = {};
        articles.forEach(a => {
          counts[a.categorie] = (counts[a.categorie] || 0) + 1;
        });
        setArticleCounts(counts);
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les catégories", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const filtered = categories.filter(c =>
    c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('categories').insert([{
        nom: formData.nom,
        description: formData.description || null,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }]);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie créée" });
      setFormData({ nom: "", description: "" });
      setOpenCreateDialog(false);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de créer la catégorie", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategorie) return;
    try {
      const { error } = await supabase.from('categories').update({
        nom: formData.nom,
        description: formData.description || null,
      }).eq('id', editingCategorie.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie modifiée" });
      setFormData({ nom: "", description: "" });
      setOpenEditDialog(false);
      setEditingCategorie(null);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de modifier", variant: "destructive" });
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase.from('categories').update({ actif: false }).eq('id', categoryId);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie désactivée" });
      fetchCategories();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const openEditForm = (categorie: Categorie) => {
    setEditingCategorie(categorie);
    setFormData({ nom: categorie.nom, description: categorie.description || "" });
    setOpenEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec recherche et bouton */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Rechercher une catégorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => { setFormData({ nom: "", description: "" }); setOpenCreateDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((categorie, index) => (
          <Card
            key={categorie.id}
            className="p-4 flex flex-col gap-3 animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Badge
                  variant="outline"
                  className={`${getColorForText(categorie.nom, 'category')} truncate`}
                >
                  {categorie.nom}
                </Badge>
              </div>
              <Badge variant={categorie.actif ? "default" : "secondary"} className="flex-shrink-0 text-xs">
                {categorie.actif ? "Active" : "Inactive"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {categorie.description || "Aucune description"}
            </p>

            <div className="text-xs text-muted-foreground">
              {(articleCounts[categorie.nom] || 0)} article{(articleCounts[categorie.nom] || 0) !== 1 ? "s" : ""}
            </div>

            <div className="flex justify-end gap-1 mt-auto">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditForm(categorie)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Désactiver la catégorie "{categorie.nom}" ? Elle ne sera plus disponible pour les nouveaux articles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(categorie.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Désactiver
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Aucune catégorie trouvée" : "Aucune catégorie créée"}
        </div>
      )}

      {/* Dialog création */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            {formData.nom && <ColorSelector type="category" name={formData.nom} label="Couleur d'affichage" />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
              <Button type="submit">Créer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la catégorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nom">Nom *</Label>
              <Input id="edit-nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            {editingCategorie && <ColorSelector type="category" name={editingCategorie.nom} label="Couleur d'affichage" />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>Annuler</Button>
              <Button type="submit">Modifier</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
