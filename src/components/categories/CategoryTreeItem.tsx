import { useState } from "react";
import { ChevronRight, ChevronDown, Edit, Trash2, Tag, GripVertical, Plus } from "lucide-react";
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
  isOver?: boolean;
}

export function CategoryTreeItem({
  category,
  depth,
  index,
  onEdit,
  onDelete,
  onAddChild,
  isOver,
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
    isOver: isSortableOver,
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
    opacity: isDragging ? 0.4 : 1,
  };

  const highlighted = isOver || isSortableOver;

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-2 sm:p-3 animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:shadow-md transition-all ${
          highlighted ? "ring-2 ring-primary bg-primary/5" : ""
        } ${isDragging ? "shadow-lg z-50" : ""}`}
        style={{
          marginLeft: `${depth * (typeof window !== "undefined" && window.innerWidth < 640 ? 12 : 24)}px`,
          animationDelay: `${index * 40}ms`,
        }}
      >
        {/* Ligne 1 : handle + chevron + icône + nom (prend toute la largeur dispo) */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-70 transition-opacity flex-shrink-0 touch-none"
            title="Glisser pour réorganiser ou imbriquer"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Expand/collapse */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 flex-shrink-0 ${!hasChildren ? "invisible" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Icon */}
          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Nom - prend toute la place restante, retour à la ligne autorisé */}
          <Badge
            variant="outline"
            className={`${getColorForText(category.nom, "category")} flex-1 min-w-0 justify-start whitespace-normal break-words text-left`}
          >
            {category.nom}
          </Badge>

          {/* Actions compactes - toujours visibles */}
          <div className="flex gap-0.5 flex-shrink-0 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onAddChild(category.id)}
              title="Ajouter une sous-catégorie"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
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

        {/* Ligne 2 : méta-infos (count + status + description) */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5 pl-[60px] sm:pl-[68px]">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
