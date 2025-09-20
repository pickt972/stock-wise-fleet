import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface DragHandleProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function DragHandle({ id, children, disabled = false }: DragHandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <div
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-70 transition-opacity ${
          disabled ? 'cursor-not-allowed opacity-20' : ''
        }`}
        title="Glisser pour réorganiser"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}