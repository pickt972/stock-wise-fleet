import { useState, useEffect } from "react";
import { Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ColorPreference {
  id: string;
  type: string;
  name: string;
  color_class: string;
}

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

export function ColorPreferencesSettings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [emplacements, setEmplacements] = useState<string[]>([]);
  const [colorPreferences, setColorPreferences] = useState<ColorPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Récupérer les catégories uniques
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('categorie, emplacement, emplacements(nom)')
        .not('categorie', 'is', null);

      if (articlesError) throw articlesError;

      const uniqueCategories = [...new Set(articlesData?.map(a => a.categorie))].filter(Boolean);
      const uniqueEmplacements = [...new Set([
        ...articlesData?.map(a => a.emplacement),
        ...articlesData?.map(a => a.emplacements?.nom)
      ])].filter(Boolean);

      setCategories(uniqueCategories);
      setEmplacements(uniqueEmplacements);

      // Récupérer les préférences de couleurs existantes
      const { data: prefsData, error: prefsError } = await supabase
        .from('color_preferences')
        .select('*')
        .eq('user_id', user?.id);

      if (prefsError) throw prefsError;
      setColorPreferences(prefsData || []);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getColorForItem = (type: string, name: string): string => {
    const existing = colorPreferences.find(p => p.type === type && p.name === name);
    return existing?.color_class || COLOR_OPTIONS[0].value;
  };

  const updateColorPreference = async (type: string, name: string, colorClass: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('color_preferences')
        .upsert({
          user_id: user.id,
          type,
          name,
          color_class: colorClass
        });

      if (error) throw error;

      // Mettre à jour l'état local
      setColorPreferences(prev => {
        const existing = prev.find(p => p.type === type && p.name === name);
        if (existing) {
          return prev.map(p => 
            p.type === type && p.name === name 
              ? { ...p, color_class: colorClass }
              : p
          );
        } else {
          return [...prev, {
            id: crypto.randomUUID(),
            type,
            name,
            color_class: colorClass
          }];
        }
      });

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la préférence",
        variant: "destructive",
      });
    }
  };

  const saveAllPreferences = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      
      toast({
        title: "Succès",
        description: "Préférences de couleurs sauvegardées",
      });

      // Recharger la page pour appliquer les nouvelles couleurs
      window.location.reload();

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Préférences de couleurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Préférences de couleurs
        </CardTitle>
        <CardDescription>
          Personnalisez les couleurs des catégories et emplacements pour une meilleure visibilité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Catégories */}
        <div>
          <h3 className="text-lg font-medium mb-3">Catégories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={`${getColorForItem('category', category)}`}
                  >
                    {category}
                  </Badge>
                </div>
                <Select
                  value={getColorForItem('category', category)}
                  onValueChange={(value) => updateColorPreference('category', category, value)}
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
            ))}
          </div>
        </div>

        {/* Emplacements */}
        <div>
          <h3 className="text-lg font-medium mb-3">Emplacements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emplacements.map((emplacement) => (
              <div key={emplacement} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={`${getColorForItem('location', emplacement)}`}
                  >
                    📍 {emplacement}
                  </Badge>
                </div>
                <Select
                  value={getColorForItem('location', emplacement)}
                  onValueChange={(value) => updateColorPreference('location', emplacement, value)}
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
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={saveAllPreferences} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Application..." : "Appliquer les changements"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}