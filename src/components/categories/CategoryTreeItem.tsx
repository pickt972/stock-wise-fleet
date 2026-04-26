import { useState } from "react";
import { ChevronRight, ChevronDown, Edit, Trash2, Tag, GripVertical, Plus, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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
}

interface CategoryTreeItemProps {
  category: CategoryNode;
  depth: number;
  index: number;
  onEdit: (category: CategoryNode) => void;
  onDelete: (categoryId: string) => void;
  onAddChild: (parentId: string) => void;
  isDragActive?: boolean;
}

export function CategoryTreeItem({
  category,
  depth,
  index,
  onEdit,
  onDelete,
  onAddChild,
  isDragActive,
}: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { getColorForText } = useColorPreferences();
  const hasChildren = category.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    data: {
      type: "category",
      category,
      depth,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Trois zones de drop distinctes pour précision maximale
  const { setNodeRef: setBeforeRef, isOver: isOverBefore } = useDroppable({
    id: `before-${category.id}`,
    data: { type: "before", targetId: category.id },
  });
  const { setNodeRef: setNestRef, isOver: isOverNest } = useDroppable({
    id: `nest-${category.id}`,
    data: { type: "nest", targetId: category.id },
  });
  const { setNodeRef: setAfterRef, isOver: isOverAfter } = useDroppable({
    id: `after-${category.id}`,
    data: { type: "after", targetId: category.id },
  });

  const indent = depth * (typeof window !== "undefined" && window.innerWidth < 640 ? 12 : 24);

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Zone drop AVANT - fine bande au-dessus, visible seulement en drag */}
      <div
        ref={setBeforeRef}
        className={`relative transition-all ${isDragActive ? "h-3" : "h-0"}`}
        style={{ marginLeft: `${indent}px` }}
      >
        {isOverBefore && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
        )}
      </div>

      <Card
        className={`p-2 sm:p-3 animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:shadow-md transition-all relative select-none ${
          depth === 0 ? "border-l-4 border-l-primary bg-card shadow-soft" : "bg-card/60"
        } ${isDragging ? "shadow-lg z-50" : ""} ${
          isOverNest
            ? "!bg-primary !border-primary ring-4 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_24px_hsl(var(--primary)/0.6)] scale-[1.02] z-20"
            : ""
        }`}
        style={{
          marginLeft: `${indent}px`,
          animationDelay: `${index * 40}ms`,
        }}
      >
        {/* Zone d'imbrication - couvre toute la carte */}
        <div
          ref={setNestRef}
          className={`absolute inset-0 rounded-[inherit] transition-all ${
            isDragActive ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {isOverNest && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="bg-primary-foreground text-primary px-4 py-2 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 animate-pulse">
                <CornerDownRight className="h-4 w-4" />
                Imbriquer dans « {category.nom} »
              </div>
            </div>
          )}
        </div>

        {/* Ligne 1 : handle + chevron + icône + nom */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 relative">
          {/* Poignée de drag — SEULE zone qui déclenche le déplacement */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex-shrink-0 flex items-center justify-center h-10 w-9 -my-1 rounded-md bg-muted/60 hover:bg-muted active:bg-muted/80 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none border border-border/60"
            title="Glissez ici pour réorganiser ou imbriquer"
            aria-label="Poignée de déplacement"
          >
            <GripVertical className="h-5 w-5" />
          </button>

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

          <Tag className={`${depth === 0 ? "h-6 w-6 text-primary" : depth === 1 ? "h-5 w-5 text-primary/70" : "h-4 w-4 text-muted-foreground"} flex-shrink-0`} />

          <h3
            className={`flex-1 min-w-0 break-words text-left ${
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
          <Badge
            variant={category.actif ? "default" : "secondary"}
            className="flex-shrink-0 text-[10px] h-5"
          >
            {category.actif ? "Active" : "Inactive"}
          </Badge>
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

      {/* Zone drop APRÈS - fine bande sous la carte, visible en drag */}
      <div
        ref={setAfterRef}
        className={`relative transition-all ${isDragActive ? "h-3" : "h-0"}`}
        style={{ marginLeft: `${indent}px` }}
      >
        {isOverAfter && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
        )}
      </div>

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
