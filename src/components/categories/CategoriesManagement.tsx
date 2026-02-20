import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorSelector } from "@/components/ui/color-selector";
import { CategoryTreeItem, CategoryNode } from "./CategoryTreeItem";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface RawCategory {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<RawCategory[]>([]);
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingCategorie, setEditingCategorie] = useState<CategoryNode | null>(null);
  const [formData, setFormData] = useState({ nom: "", description: "", parent_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("nom");
      if (error) throw error;
      setCategories((data as RawCategory[]) || []);

      const { data: articles } = await supabase
        .from("articles")
        .select("categorie");
      if (articles) {
        const counts: Record<string, number> = {};
        articles.forEach((a) => {
          counts[a.categorie] = (counts[a.categorie] || 0) + 1;
        });
        setArticleCounts(counts);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Build tree from flat list
  const buildTree = useCallback(
    (items: RawCategory[], query: string): CategoryNode[] => {
      const map = new Map<string, CategoryNode>();
      const lq = query.toLowerCase();

      items.forEach((c) => {
        map.set(c.id, {
          ...c,
          description: c.description || undefined,
          children: [],
          articleCount: articleCounts[c.nom] || 0,
          totalArticleCount: 0,
        });
      });

      const roots: CategoryNode[] = [];
      items.forEach((c) => {
        const node = map.get(c.id)!;
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.children.push(node);
        } else {
          roots.push(node);
        }
      });

      // Calculate total article counts (recursive)
      const calcTotal = (node: CategoryNode): number => {
        node.totalArticleCount =
          node.articleCount +
          node.children.reduce((sum, ch) => sum + calcTotal(ch), 0);
        return node.totalArticleCount;
      };
      roots.forEach(calcTotal);

      // Filter if search query
      if (!query) return roots;

      const matches = (node: CategoryNode): boolean => {
        if (
          node.nom.toLowerCase().includes(lq) ||
          (node.description || "").toLowerCase().includes(lq)
        )
          return true;
        return node.children.some(matches);
      };

      const filterTree = (nodes: CategoryNode[]): CategoryNode[] =>
        nodes
          .filter(matches)
          .map((n) => ({ ...n, children: filterTree(n.children) }));

      return filterTree(roots);
    },
    [articleCounts]
  );

  const tree = useMemo(
    () => buildTree(categories, searchQuery),
    [categories, searchQuery, buildTree]
  );

  // Flatten tree for sortable IDs
  const flatIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (nodes: CategoryNode[]) => {
      nodes.forEach((n) => {
        ids.push(n.id);
        walk(n.children);
      });
    };
    walk(tree);
    return ids;
  }, [tree]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Make activeId a child of overId
    try {
      const { error } = await supabase
        .from("categories")
        .update({ parent_id: overId })
        .eq("id", activeId);
      if (error) throw error;

      toast({ title: "Succès", description: "Catégorie déplacée" });
      fetchCategories();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de déplacer la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("categories").insert([
        {
          nom: formData.nom,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie créée" });
      setFormData({ nom: "", description: "", parent_id: "" });
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
        .from("categories")
        .update({
          nom: formData.nom,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
        })
        .eq("id", editingCategorie.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie modifiée" });
      setFormData({ nom: "", description: "", parent_id: "" });
      setOpenEditDialog(false);
      setEditingCategorie(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ actif: false })
        .eq("id", categoryId);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie désactivée" });
      fetchCategories();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (category: CategoryNode) => {
    setEditingCategorie(category);
    setFormData({
      nom: category.nom,
      description: category.description || "",
      parent_id: category.parent_id || "",
    });
    setOpenEditDialog(true);
  };

  const openAddChild = (parentId: string) => {
    setFormData({ nom: "", description: "", parent_id: parentId });
    setOpenCreateDialog(true);
  };

  // Get flat list of categories for parent selector (excluding self and descendants)
  const getParentOptions = (excludeId?: string) => {
    const options: { id: string; nom: string; depth: number }[] = [];
    const walk = (nodes: CategoryNode[], depth: number) => {
      nodes.forEach((n) => {
        if (n.id !== excludeId) {
          options.push({ id: n.id, nom: n.nom, depth });
          walk(
            n.children.filter((c) => c.id !== excludeId),
            depth + 1
          );
        }
      });
    };
    walk(buildTree(categories, ""), 0);
    return options;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Rechercher une catégorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            setFormData({ nom: "", description: "", parent_id: "" });
            setOpenCreateDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        💡 Glissez une catégorie sur une autre pour l'imbriquer comme sous-catégorie
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {tree.map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                depth={0}
                index={globalIndex++}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onAddChild={openAddChild}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="bg-card border rounded-lg p-3 shadow-lg opacity-80 text-sm font-medium">
              {categories.find((c) => c.id === activeId)?.nom || "Catégorie"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {tree.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? "Aucune catégorie trouvée"
            : "Aucune catégorie créée"}
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
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie parente</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, parent_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune (racine)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (racine)</SelectItem>
                  {getParentOptions().map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {"—".repeat(opt.depth)} {opt.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.nom && (
              <ColorSelector
                type="category"
                name={formData.nom}
                label="Couleur d'affichage"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreateDialog(false)}
              >
                Annuler
              </Button>
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
              <Input
                id="edit-nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie parente</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, parent_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune (racine)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (racine)</SelectItem>
                  {getParentOptions(editingCategorie?.id).map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {"—".repeat(opt.depth)} {opt.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingCategorie && (
              <ColorSelector
                type="category"
                name={editingCategorie.nom}
                label="Couleur d'affichage"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Modifier</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
