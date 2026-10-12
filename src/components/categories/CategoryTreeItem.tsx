import { CategoryIcon } from "./CategoryIcon";
import { useState } from "react";
import { ChevronRight, ChevronDown, Edit, Trash2, Tag, GripVertical, Plus, CornerDownRight, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { useColorPreferences } from "@/hooks/useColorPreferences";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { canDropCategory, type HierarchyItem } from "./categoryDropRules";

export interface CategoryNode {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: CategoryNode[];
  articleCount: number;
  totalArticleCount: number;
  requires_vehicle?: boolean | null;
}

interface CategoryTreeItemProps {
  category: CategoryNode;
  depth: number;
  index: number;
  onEdit: (category: CategoryNode) => void;
  onDelete: (categoryId: string) => void;
  onAddChild: (parentId: string) => void;
  isDragActive?: boolean;
  inheritedVehicle?: boolean;
  activeCategoryId?: string | null;
  allCategories: HierarchyItem[];
  isMobile: boolean;
  flashId: string | null;
  moving: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function CategoryTreeItem({
  category,
  depth,
  index,
  onEdit,
  onDelete,
  onAddChild,
  isDragActive,
  inheritedVehicle = false,
  activeCategoryId, allCategories, isMobile, flashId, moving, onMove, canMoveUp, canMoveDown,
}: CategoryTreeItemProps) {
  const { toast } = useToast();
  const [requiresVehicle, setRequiresVehicle] = useState<boolean | null>(category.requires_vehicle ?? null);
  const effectiveVehicle = inheritedVehicle || !!requiresVehicle;
  const toggleVehicle = async (checked: boolean) => {
    const prev = requiresVehicle;
    const next = depth === 0 ? checked : checked ? true : null;
    setRequiresVehicle(next);
    const { error } = await supabase.from("categories").update({ requires_vehicle: next } as any).eq("id", category.id);
    if (error) {
      setRequiresVehicle(prev);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paramètre mis à jour" });
    }
  };
  const [actif, setActif] = useState(category.actif);
  const [savingActive, setSavingActive] = useState(false);
  const effectiveInactive = parentInactive || !actif;
  const toggleActive = async () => {
    const next = !actif;
    setSavingActive(true);
    const { error } = await supabase.from("categories").update({ actif: next }).eq("id", category.id);
    setSavingActive(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setActif(next);
      toast({ title: next ? "Catégorie activée" : "Catégorie désactivée", duration: 2000 });
    }
  };
  const [isExpanded, setIsExpanded] = useState(true);
  const { getColorForText } = useColorPreferences();
  const hasChildren = category.children.length > 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: category.id, disabled: isMobile || moving,
    data: { type: "category", category, depth },
  });
  const valid = (intent: "before" | "nest" | "after") => !!activeCategoryId && canDropCategory(allCategories, activeCategoryId, category.id, intent);
  const { setNodeRef: setBeforeRef, isOver: overBefore } = useDroppable({ id: `before-${category.id}`, disabled: !isDragActive, data: { intent: "before", targetId: category.id } });
  const { setNodeRef: setNestRef, isOver: overNest } = useDroppable({ id: `nest-${category.id}`, disabled: !isDragActive, data: { intent: "nest", targetId: category.id } });
  const { setNodeRef: setAfterRef, isOver: overAfter } = useDroppable({ id: `after-${category.id}`, disabled: !isDragActive, data: { intent: "after", targetId: category.id } });
  const isOverBefore = overBefore && valid("before");
  const isOverNest = overNest && valid("nest");
  const isOverAfter = overAfter && valid("after");
  const siblings = allCategories.filter((item) => item.parent_id === category.id);

  const indent = depth * (typeof window !== "undefined" && window.innerWidth < 640 ? 12 : 24);

  return (
    <div className="relative">
      <Card
        ref={setNodeRef}
        data-category-id={category.id}
        className={`category-drag-row p-2 sm:p-3 relative select-none ${
          depth === 0 ? "border-l-4 border-l-primary bg-card shadow-soft" : "bg-card/60"
        } ${isDragging ? "opacity-50" : ""} ${isOverNest ? "ring-2 ring-primary bg-primary/10" : ""} ${flashId === category.id ? "category-drop-success" : ""}`}
        style={{ marginLeft: `${indent}px` }}
      >
        <div ref={setBeforeRef} className="absolute inset-x-0 top-0 h-[30%] pointer-events-none" />
        <div ref={setNestRef} className="absolute inset-x-0 top-[30%] h-[40%] pointer-events-none" />
        <div ref={setAfterRef} className="absolute inset-x-0 bottom-0 h-[30%] pointer-events-none" />
        {isOverBefore && <div className="category-drop-line category-drop-before" />}
        {isOverAfter && <div className="category-drop-line category-drop-after" />}
        {isOverNest && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold shadow-medium flex items-center gap-2 max-w-full">
              <CornerDownRight className="h-4 w-4 shrink-0" />
              <span className="truncate">Imbriquer dans « {category.nom} »</span>
            </div>
          </div>
        )}

        {/* Ligne 1 : handle + chevron + icône + nom */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0 relative">
          {/* Poignée de drag — SEULE zone qui déclenche le déplacement */}
          <Button
            type="button"
            {...attributes}
            {...(!isMobile ? listeners : {})}
            variant="ghost"
            className={`flex-shrink-0 h-10 w-8 p-0 text-muted-foreground ${isMobile ? "pointer-events-none" : "dnd-handle cursor-grab active:cursor-grabbing"}`}
            title="Déplacer la catégorie"
            aria-label={`Déplacer ${category.nom}`}
            tabIndex={isMobile ? -1 : 0}
          >
            <GripVertical className="h-5 w-5" />
          </Button>
          {isMobile && <div className="flex shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-7" disabled={moving || !canMoveUp} onClick={() => onMove(category.id, -1)} aria-label={`Monter ${category.nom}`} title="Monter"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-7" disabled={moving || !canMoveDown} onClick={() => onMove(category.id, 1)} aria-label={`Descendre ${category.nom}`} title="Descendre"><ArrowDown className="h-4 w-4" /></Button>
          </div>}

          {/* Expand/collapse */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 flex-shrink-0 ${!hasChildren ? "invisible" : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>

          {depth === 0 ? <CategoryIcon name={category.nom} className="h-6 w-6 text-primary flex-shrink-0" /> : <Tag className={`${depth === 0 ? "h-6 w-6 text-primary" : depth === 1 ? "h-5 w-5 text-primary/70" : "h-4 w-4 text-muted-foreground"} flex-shrink-0`} />}

          <h3
            className={`order-last basis-full sm:order-none sm:basis-auto sm:flex-1 min-w-0 break-words text-left ${
              depth === 0
                ? "text-base sm:text-lg font-extrabold tracking-tight uppercase text-primary leading-tight"
                : depth === 1
                ? "text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug"
                : "text-sm sm:text-base font-semibold italic text-foreground/75 leading-snug"
            }`}
          >
            {category.nom}
          </h3>

          <div className="flex gap-0.5 flex-shrink-0 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onAddChild(category.id)}
              title="Ajouter une sous-catégorie"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onEdit(category)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Supprimer définitivement la catégorie "{category.nom}" ?
                  {hasChildren &&
                    " Les sous-catégories seront également supprimées."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Ligne 2 : méta-infos */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5 pl-[60px] sm:pl-[68px] relative">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleActive}
            disabled={savingActive}
            title={actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
            className="rounded-full cursor-pointer transition-all hover:shadow-medium hover:brightness-95 disabled:cursor-wait"
          >
            <Badge variant={actif ? "default" : "secondary"} className="flex-shrink-0 text-[10px] h-5 min-w-[52px] justify-center pointer-events-none">
              {savingActive ? <Loader2 className="h-3 w-3 animate-spin" /> : actif ? "Active" : "Inactive"}
            </Badge>
          </button>
          {parentInactive && (
            <Badge variant="secondary" className="flex-shrink-0 text-[10px] h-5 opacity-70">Inactive · Hérité</Badge>
          )}
          {inheritedVehicle ? (
            <Badge variant="secondary" className="flex-shrink-0 text-[10px] h-5">🚗 Hérité</Badge>
          ) : (
            <label
              className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              🚗 Véhicule requis
              <Switch checked={!!requiresVehicle} onCheckedChange={toggleVehicle} className="scale-75" />
            </label>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {category.totalArticleCount > 0
              ? `${category.totalArticleCount} article${category.totalArticleCount !== 1 ? "s" : ""}`
              : "0 article"}
            {category.articleCount !== category.totalArticleCount && category.articleCount > 0
              ? ` (${category.articleCount} direct)`
              : ""}
          </span>
          {category.description && (
            <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
              {category.description}
            </span>
          )}
        </div>
      </Card>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {category.children.map((child, childIndex) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              depth={depth + 1}
              index={index + childIndex + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              isDragActive={isDragActive}
              inheritedVehicle={effectiveVehicle}
              activeCategoryId={activeCategoryId}
              allCategories={allCategories}
              isMobile={isMobile}
              flashId={flashId}
              moving={moving}
              onMove={onMove}
              canMoveUp={childIndex > 0}
              canMoveDown={childIndex < siblings.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
