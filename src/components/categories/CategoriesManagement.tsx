import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  MeasuringStrategy,
  pointerWithin,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { useIsMobile } from "@/hooks/use-mobile";
import { canDropCategory, edgeScrollSpeed } from "./categoryDropRules";

interface RawCategory {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  requires_vehicle?: boolean | null;
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

  const isMobile = useIsMobile();
  const [moving, setMoving] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [invalidDrop, setInvalidDrop] = useState(false);
  const [ghost, setGhost] = useState<{ html: string; width: number; height: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!activeId) return;
    const update = (event: MouseEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; };
    document.addEventListener("mousemove", update);
    let frame: number;
    const scroll = () => {
      const list = listRef.current;
      if (list && pointer.current) {
        let container = list.parentElement;
        while (container && !(container.scrollHeight > container.clientHeight && /auto|scroll/.test(getComputedStyle(container).overflowY))) container = container.parentElement;
        const rect = list.getBoundingClientRect();
        const bounds = container?.getBoundingClientRect();
        const top = Math.max(rect.top, bounds?.top ?? 0, 0);
        const bottom = Math.min(rect.bottom, bounds?.bottom ?? window.innerHeight, window.innerHeight);
        const speed = pointer.current.x >= rect.left && pointer.current.x <= rect.right ? edgeScrollSpeed(pointer.current.y, top, bottom) : 0;
        if (speed) { if (container) container.scrollTop += speed; else window.scrollBy(0, speed); }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("mousemove", update); pointer.current = null; };
  }, [activeId]);
  useEffect(() => {
    document.body.classList.toggle("category-drag-invalid", !!activeId && invalidDrop);
    return () => document.body.classList.remove("category-drag-invalid");
  }, [activeId, invalidDrop]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

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
        const node = map.get(c.id);
        if (!node) return;
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)?.children.push(node);
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

  const handleDragStart = (event: DragStartEvent) => {
    setInvalidDrop(false);
    const row = document.querySelector<HTMLElement>(`[data-category-id="${event.active.id}"]`);
    if (row) {
      const rect = row.getBoundingClientRect();
      const clone = row.cloneNode(true) as HTMLElement;
      clone.style.marginLeft = "0";
      clone.classList.remove("opacity-50", "category-drop-success");
      setGhost({ html: clone.outerHTML, width: rect.width, height: rect.height });
    }
    const mouse = event.activatorEvent as MouseEvent;
    pointer.current = { x: mouse.clientX, y: mouse.clientY };
    setActiveId(String(event.active.id));
  };

  const finishMove = async (id: string) => {
    await fetchCategories();
    clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = setTimeout(() => setFlashId(null), 300);
    toast({ title: "Ordre mis à jour", duration: 2000 });
  };
  const handleArrowMove = async (id: string, direction: -1 | 1) => {
    if (moving) return;
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    const siblings = categories.filter((item) => item.parent_id === category.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order || a.nom.localeCompare(b.nom));
    const index = siblings.findIndex((item) => item.id === id);
    const target = siblings[index + direction];
    if (!target) return;
    siblings.splice(index, 1);
    siblings.splice(index + direction, 0, category);
    setMoving(true);
    try {
      const { error } = await supabase.rpc("reorder_categories", { _parent_id: category.parent_id, _ordered_ids: siblings.map((item) => item.id) });
      if (error) throw error;
      await finishMove(id);
    } catch (error) {
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de déplacer la catégorie", variant: "destructive" });
    } finally { setMoving(false); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setGhost(null);
    setInvalidDrop(false);
    if (moving) return;
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

    if (!canDropCategory(categories, activeIdStr, targetId, dropType)) return;
    setMoving(true);

    try {
      if (dropType === "nest") {
        // Imbriquer dans la catégorie cible
        if (activeCat.parent_id === targetCat.id) return;
        const { error } = await supabase.rpc("move_category", {
          _category_id: activeIdStr,
          _new_parent_id: targetCat.id,
        });
        if (error) throw error;

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

      }
      await finishMove(activeIdStr);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de déplacer la catégorie",
        variant: "destructive",
      });
      fetchCategories();
    } finally { setMoving(false); }
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
          const current = queue.shift();
          if (!current) continue;
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

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        autoScroll={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={({ active, over }) => {
          const data = over?.data.current;
          setInvalidDrop(!!data && !canDropCategory(categories, String(active.id), data.targetId, data.intent));
        }}
        onDragCancel={() => { setActiveId(null); setGhost(null); setInvalidDrop(false); }}
      >
          <div ref={listRef} className="dnd-container space-y-1">
            {tree.map((category, rootIndex) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                depth={0}
                index={globalIndex++}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onAddChild={openAddChild}
                isDragActive={!!activeId}
                activeCategoryId={activeId}
                allCategories={categories}
                isMobile={isMobile}
                flashId={flashId}
                moving={moving}
                onMove={handleArrowMove}
                canMoveUp={rootIndex > 0}
                canMoveDown={rootIndex < tree.length - 1}
              />
            ))}
          </div>
        <DragOverlay dropAnimation={null} zIndex={9999} adjustScale={false}>
          {activeId && ghost ? (
            <div aria-hidden="true" className="dnd-overlay shadow-large" style={{ width: ghost.width, height: ghost.height }} dangerouslySetInnerHTML={{ __html: ghost.html }} />
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
