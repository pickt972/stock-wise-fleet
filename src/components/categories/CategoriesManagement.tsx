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
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Tag as TagIcon } from "lucide-react";

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
    // Souris/stylet : démarre vite (8 px) pour fluidité desktop
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Tactile : appui long 1200 ms (tolérance 5 px) — laisse le scroll libre
    useSensor(TouchSensor, { activationConstraint: { delay: 1200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

    // Type de drop : "before-<id>", "after-<id>", "nest-<id>"
    let dropType: "before" | "after" | "nest" | null = null;
    let targetId: string | null = null;
    if (overIdRaw.startsWith("before-")) {
      dropType = "before";
      targetId = overIdRaw.slice("before-".length);
    } else if (overIdRaw.startsWith("after-")) {
      dropType = "after";
      targetId = overIdRaw.slice("after-".length);
    } else if (overIdRaw.startsWith("nest-")) {
      dropType = "nest";
      targetId = overIdRaw.slice("nest-".length);
    }
    if (!dropType || !targetId || targetId === activeIdStr) return;

    const activeCat = categories.find((c) => c.id === activeIdStr);
    const targetCat = categories.find((c) => c.id === targetId);
    if (!activeCat || !targetCat) return;

    // Garde-fou anti-cycle
    const isDescendant = (parentId: string, candidateId: string): boolean => {
      const children = categories.filter((c) => c.parent_id === parentId);
      for (const ch of children) {
        if (ch.id === candidateId) return true;
        if (isDescendant(ch.id, candidateId)) return true;
      }
      return false;
    };
    if (isDescendant(activeIdStr, targetId)) {
      toast({
        title: "Action impossible",
        description: "Impossible de déplacer une catégorie sous l'un de ses descendants",
        variant: "destructive",
      });
      return;
    }

    try {
      if (dropType === "nest") {
        // Imbriquer dans la catégorie cible
        if (activeCat.parent_id === targetCat.id) return;
        const { error } = await supabase.rpc("move_category", {
          _category_id: activeIdStr,
          _new_parent_id: targetCat.id,
        });
        if (error) throw error;
        toast({ title: "Catégorie imbriquée", description: `Déplacée dans « ${targetCat.nom} »` });
      } else {
        // before/after : positionner comme voisin de targetCat (même parent que targetCat)
        const newParentId = targetCat.parent_id;

        // Construire la liste ordonnée des frères du parent cible (sans l'élément actif s'il est déjà là)
        const siblings = categories
          .filter((c) => c.parent_id === newParentId && c.id !== activeIdStr)
          .sort((a, b) => a.sort_order - b.sort_order || a.nom.localeCompare(b.nom));

        const targetIdx = siblings.findIndex((s) => s.id === targetId);
        if (targetIdx === -1) return;
        const insertIdx = dropType === "before" ? targetIdx : targetIdx + 1;
        siblings.splice(insertIdx, 0, activeCat);

        // Si parent change → d'abord déplacer
        if (activeCat.parent_id !== newParentId) {
          const { error: moveErr } = await supabase.rpc("move_category", {
            _category_id: activeIdStr,
            _new_parent_id: newParentId,
          });
          if (moveErr) throw moveErr;
        }

        const { error } = await supabase.rpc("reorder_categories", {
          _parent_id: newParentId,
          _ordered_ids: siblings.map((s) => s.id),
        });
        if (error) throw error;
        toast({ title: "Ordre mis à jour" });
      }
      await fetchCategories();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de déplacer la catégorie",
        variant: "destructive",
      });
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

      <div className="text-xs text-muted-foreground bg-muted/40 border rounded-lg p-2.5 leading-relaxed">
        💡 <strong>Maintenez l'icône</strong> ⋮⋮ puis glissez :
        <ul className="mt-1 ml-5 list-disc space-y-0.5">
          <li>Sur la <strong>ligne bleue</strong> au-dessus/en-dessous d'une catégorie pour la <strong>réordonner</strong>.</li>
          <li>Au <strong>centre</strong> d'une catégorie (badge « Imbriquer dans... ») pour en faire une <strong>sous-catégorie</strong>.</li>
        </ul>
        <span className="block mt-1 text-[11px]">Sur mobile : <strong>appui long</strong> sur l'icône avant de glisser.</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        modifiers={[snapCenterToCursor]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
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
                isDragActive={!!activeId}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="bg-primary text-primary-foreground border-2 border-primary-foreground/20 rounded-lg px-3 py-2 shadow-2xl text-sm font-semibold flex items-center gap-2 cursor-grabbing">
              <TagIcon className="h-3.5 w-3.5" />
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
