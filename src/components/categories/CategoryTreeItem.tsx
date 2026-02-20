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
        className={`p-3 flex items-center gap-2 animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:shadow-md transition-all ${
          highlighted ? "ring-2 ring-primary bg-primary/5" : ""
        } ${isDragging ? "shadow-lg z-50" : ""}`}
        style={{
          marginLeft: `${depth * 24}px`,
          animationDelay: `${index * 40}ms`,
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-70 transition-opacity flex-shrink-0"
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

        {/* Icon + Name */}
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Badge
          variant="outline"
          className={`${getColorForText(category.nom, "category")} truncate`}
        >
          {category.nom}
        </Badge>

        {/* Description */}
        <span className="text-sm text-muted-foreground truncate hidden sm:inline flex-1 min-w-0">
          {category.description || ""}
        </span>

        <div className="flex-1" />

        {/* Article count */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {category.totalArticleCount > 0
            ? `${category.totalArticleCount} article${category.totalArticleCount !== 1 ? "s" : ""}`
            : "0 article"}
          {category.articleCount !== category.totalArticleCount && category.articleCount > 0
            ? ` (${category.articleCount} direct)`
            : ""}
        </span>

        {/* Status */}
        <Badge
          variant={category.actif ? "default" : "secondary"}
          className="flex-shrink-0 text-xs"
        >
          {category.actif ? "Active" : "Inactive"}
        </Badge>

        {/* Actions */}
        <div className="flex gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddChild(category.id)}
            title="Ajouter une sous-catégorie"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onEdit(category)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Désactiver la catégorie "{category.nom}" ?
                  {hasChildren &&
                    " Les sous-catégories seront également affectées."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Désactiver
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
