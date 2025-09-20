import { ArrowUpDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CompactSortControlsProps {
  sortOptions: Array<{ value: string; label: string }>;
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  showDragHandle?: boolean;
}

export function CompactSortControls({ 
  sortOptions, 
  currentSort, 
  currentDirection, 
  onSortChange,
  showDragHandle = true 
}: CompactSortControlsProps) {
  const toggleDirection = () => {
    onSortChange(currentSort, currentDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentSort} onValueChange={(value) => onSortChange(value, currentDirection)}>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Trier par..." />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        className="h-8 w-8 p-0"
        title={currentDirection === 'asc' ? 'Croissant' : 'Décroissant'}
      >
        <ArrowUpDown className="h-3 w-3" />
      </Button>
      
      {showDragHandle && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
          <GripVertical className="h-3 w-3" />
          Glisser pour réorganiser
        </div>
      )}
    </div>
  );
}