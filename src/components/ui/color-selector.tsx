import { useState } from "react";
import { Palette } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useColorPreferences } from "@/hooks/useColorPreferences";

const COLOR_OPTIONS = [
  { value: "bg-blue-100 text-blue-800 border-blue-300", label: "Bleu", preview: "bg-blue-100" },
  { value: "bg-green-100 text-green-800 border-green-300", label: "Vert", preview: "bg-green-100" },
  { value: "bg-purple-100 text-purple-800 border-purple-300", label: "Violet", preview: "bg-purple-100" },
  { value: "bg-orange-100 text-orange-800 border-orange-300", label: "Orange", preview: "bg-orange-100" },
  { value: "bg-pink-100 text-pink-800 border-pink-300", label: "Rose", preview: "bg-pink-100" },
  { value: "bg-teal-100 text-teal-800 border-teal-300", label: "Teal", preview: "bg-teal-100" },
  { value: "bg-indigo-100 text-indigo-800 border-indigo-300", label: "Indigo", preview: "bg-indigo-100" },
  { value: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Jaune", preview: "bg-yellow-100" },
  { value: "bg-red-100 text-red-800 border-red-300", label: "Rouge", preview: "bg-red-100" },
  { value: "bg-cyan-100 text-cyan-800 border-cyan-300", label: "Cyan", preview: "bg-cyan-100" },
];

interface ColorSelectorProps {
  type: 'category' | 'location';
  name: string;
  label?: string;
}

export function ColorSelector({ type, name, label }: ColorSelectorProps) {
  const { user } = useAuth();
  const { getColorForText, refreshPreferences } = useColorPreferences();
  const [selectedColor, setSelectedColor] = useState(getColorForText(name, type));

  const updateColorPreference = async (colorClass: string) => {
    if (!user) return;

    try {
      await supabase
        .from('color_preferences')
        .upsert({
          user_id: user.id,
          type,
          name,
          color_class: colorClass
        });

      setSelectedColor(colorClass);
      refreshPreferences();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la couleur:', error);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        {label || "Couleur d'affichage"}
      </Label>
      
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={selectedColor}
        >
          {type === 'location' && '📍'} {name}
        </Badge>
        
        <Select
          value={selectedColor}
          onValueChange={updateColorPreference}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-50">
            {COLOR_OPTIONS.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${color.preview} border`} />
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}