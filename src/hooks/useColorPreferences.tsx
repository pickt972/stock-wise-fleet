import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ColorPreference {
  type: string;
  name: string;
  color_class: string;
}

const DEFAULT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-green-100 text-green-800 border-green-300", 
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-pink-100 text-pink-800 border-pink-300",
  "bg-teal-100 text-teal-800 border-teal-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "bg-red-100 text-red-800 border-red-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300"
];

export function useColorPreferences() {
  const [colorPreferences, setColorPreferences] = useState<ColorPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchColorPreferences();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchColorPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('color_preferences')
        .select('type, name, color_class')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setColorPreferences(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des préférences de couleurs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getColorForText = (text: string, type: 'category' | 'location' = 'category'): string => {
    if (!text) return DEFAULT_COLORS[0];
    
    // Chercher d'abord dans les préférences utilisateur
    const userPreference = colorPreferences.find(
      p => p.type === type && p.name === text
    );
    
    if (userPreference) {
      return userPreference.color_class;
    }
    
    // Fallback: utiliser l'algorithme de hash par défaut
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
  };

  return {
    getColorForText,
    isLoading,
    refreshPreferences: fetchColorPreferences
  };
}