import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SortOption {
  value: string;
  label: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface SortControlsProps {
  sortOptions: SortOption[];
  onSortChange: (sorts: SortConfig[]) => void;
  maxSorts?: number;
}

export function SortControls({ sortOptions, onSortChange, maxSorts = 3 }: SortControlsProps) {
  const [sorts, setSorts] = useState<SortConfig[]>([]);

  const addSort = () => {
    if (sorts.length < maxSorts) {
      const newSort: SortConfig = {
        field: sortOptions[0]?.value || '',
        direction: 'asc',
        priority: sorts.length + 1
      };
      const newSorts = [...sorts, newSort];
      setSorts(newSorts);
      onSortChange(newSorts);
    }
  };

  const removeSort = (index: number) => {
    const newSorts = sorts.filter((_, i) => i !== index)
      .map((sort, i) => ({ ...sort, priority: i + 1 }));
    setSorts(newSorts);
    onSortChange(newSorts);
  };

  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = sorts.map((sort, i) => 
      i === index ? { ...sort, ...updates } : sort
    );
    setSorts(newSorts);
    onSortChange(newSorts);
  };

  const updatePriority = (index: number, newPriority: number) => {
    const newSorts = [...sorts];
    newSorts[index].priority = newPriority;
    
    // Réorganiser les priorités
    newSorts.sort((a, b) => a.priority - b.priority);
    newSorts.forEach((sort, i) => sort.priority = i + 1);
    
    setSorts(newSorts);
    onSortChange(newSorts);
  };

  const clearSorts = () => {
    setSorts([]);
    onSortChange([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Tri et classement</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addSort}
              disabled={sorts.length >= maxSorts}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
            {sorts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSorts}>
                Effacer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorts.map((sort, index) => (
          <div key={index} className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Critère {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSort(index)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Champ</Label>
                <Select 
                  value={sort.field} 
                  onValueChange={(value) => updateSort(index, { field: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Direction</Label>
                <Select 
                  value={sort.direction} 
                  onValueChange={(value: 'asc' | 'desc') => updateSort(index, { direction: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      <div className="flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Croissant
                      </div>
                    </SelectItem>
                    <SelectItem value="desc">
                      <div className="flex items-center">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Décroissant
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Priorité: {sort.priority}</Label>
              <Slider
                value={[sort.priority]}
                onValueChange={([value]) => updatePriority(index, value)}
                max={maxSorts}
                min={1}
                step={1}
                className="mt-1"
              />
            </div>
          </div>
        ))}
        
        {sorts.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Aucun critère de tri configuré.
            <br />
            Cliquez sur "Ajouter" pour commencer.
          </div>
        )}
      </CardContent>
    </Card>
  );
}