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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColorSelector } from "@/components/ui/color-selector";
import { CategoryTreeItem, CategoryNode } from "./CategoryTreeItem";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
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

    const activeIdStr = active.id as string;
    const overIdRaw = over.id as string;

    // Détecter si on a déposé sur une zone d'imbrication (nest-<id>)
    const isNestDrop = overIdRaw.startsWith("nest-");
    const overIdStr = isNestDrop ? overIdRaw.slice("nest-".length) : overIdRaw;

    if (activeIdStr === overIdStr) return;

    const activeCat = categories.find((c) => c.id === activeIdStr);
    const overCat = categories.find((c) => c.id === overIdStr);
    if (!activeCat || !overCat) return;

    // Garde-fou : empêcher de déposer une catégorie sur l'un de ses descendants
    const isDescendant = (parentId: string, candidateId: string): boolean => {
      const children = categories.filter((c) => c.parent_id === parentId);
      for (const ch of children) {
        if (ch.id === candidateId) return true;
        if (isDescendant(ch.id, candidateId)) return true;
      }
      return false;
    };

    try {
      // Imbrication forcée (drop sur la zone "nest" d'une catégorie)
      // OU parents différents (comportement existant)
      const shouldNest = isNestDrop || activeCat.parent_id !== overCat.parent_id;

      if (!shouldNest) {
        // Cas 1 : même parent → réordonner via RPC atomique
        const siblings = categories
          .filter((c) => c.parent_id === activeCat.parent_id)
          .sort((a, b) => a.sort_order - b.sort_order || a.nom.localeCompare(b.nom));
        const fromIdx = siblings.findIndex((s) => s.id === activeIdStr);
        const toIdx = siblings.findIndex((s) => s.id === overIdStr);
        if (fromIdx === -1 || toIdx === -1) return;

        const reordered = [...siblings];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);

        const { error } = await supabase.rpc("reorder_categories", {
          _parent_id: activeCat.parent_id,
          _ordered_ids: reordered.map((s) => s.id),
        });
        if (error) throw error;

        toast({ title: "Ordre mis à jour" });
      } else {
        // Cas 2 : imbriquer sous overCat (avec garde anti-cycle)
        if (activeCat.parent_id === overCat.id) {
          // Déjà sous ce parent → rien à faire
          return;
        }
        if (isDescendant(activeIdStr, overIdStr)) {
          toast({
            title: "Action impossible",
            description: "Impossible d'imbriquer une catégorie sous l'un de ses descendants",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.rpc("move_category", {
          _category_id: activeIdStr,
          _new_parent_id: overCat.id,
        });
        if (error) throw error;
        toast({ title: "Catégorie déplacée", description: `Imbriquée sous « ${overCat.nom} »` });
      }
      await fetchCategories();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de déplacer la catégorie",
        variant: "destructive",
      });
      // Recharger pour resynchroniser l'UI avec la BDD
      fetchCategories();
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
      // Récupérer la catégorie + tous ses descendants depuis la liste plate
      const collectIds = (rootId: string, list: RawCategory[]): string[] => {
        const ids = [rootId];
        const queue = [rootId];
        while (queue.length) {
          const current = queue.shift()!;
          list
            .filter((c) => c.parent_id === current)
            .forEach((c) => {
              ids.push(c.id);
              queue.push(c.id);
            });
        }
        return ids;
      };
      const ids = collectIds(categoryId, categories);
      const names = categories
        .filter((c) => ids.includes(c.id))
        .map((c) => c.nom);

      // Vérifier si des articles utilisent ces catégories/sous-catégories
      const { count, error: countError } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .or(
          `categorie.in.(${names.map((n) => `"${n}"`).join(",")}),sous_categorie.in.(${names.map((n) => `"${n}"`).join(",")})`
        );
      if (countError) throw countError;

      if ((count ?? 0) > 0) {
        toast({
          title: "Suppression impossible",
          description: `${count} article(s) utilisent cette catégorie. Réaffectez-les avant de supprimer.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("categories")
        .delete()
        .in("id", ids);
      if (error) throw error;
      toast({ title: "Succès", description: "Catégorie supprimée" });
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer",
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
        💡 Glissez sur un voisin pour réordonner, ou sur une catégorie d'un autre parent pour l'imbriquer comme sous-catégorie.
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pw = pointerWithin(args);
          if (pw.length > 0) return pw;
          return rectIntersection(args);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={flatIds}>
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
              <SearchableSelect
                options={[
                  { value: "none", label: "Aucune (racine)" },
                  ...getParentOptions().map((opt) => ({
                    value: opt.id,
                    label: `${"—".repeat(opt.depth)} ${opt.nom}`,
                  })),
                ]}
                value={formData.parent_id || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, parent_id: v === "none" ? "" : v })
                }
                placeholder="Aucune (racine)"
                searchPlaceholder="Rechercher une catégorie..."
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
              <SearchableSelect
                options={[
                  { value: "none", label: "Aucune (racine)" },
                  ...getParentOptions(editingCategorie?.id).map((opt) => ({
                    value: opt.id,
                    label: `${"—".repeat(opt.depth)} ${opt.nom}`,
                  })),
                ]}
                value={formData.parent_id || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, parent_id: v === "none" ? "" : v })
                }
                placeholder="Aucune (racine)"
                searchPlaceholder="Rechercher une catégorie..."
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
