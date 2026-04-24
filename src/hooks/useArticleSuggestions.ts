import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère les valeurs distinctes existantes pour les champs articles
 * (marque, designation, categorie, emplacement) afin d'alimenter
 * l'autocomplétion et limiter les doublons.
 */
export function useArticleSuggestions() {
  return useQuery({
    queryKey: ["article-suggestions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("marque, designation, categorie, emplacement");
      if (error) throw error;

      const marques = new Set<string>();
      const designations = new Set<string>();
      const categories = new Set<string>();
      const emplacements = new Set<string>();
      (data ?? []).forEach((a: any) => {
        if (a.marque) marques.add(String(a.marque).trim());
        if (a.designation) designations.add(String(a.designation).trim());
        if (a.categorie) categories.add(String(a.categorie).trim());
        if (a.emplacement) emplacements.add(String(a.emplacement).trim());
      });

      const sort = (s: Set<string>) =>
        Array.from(s).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" })
        );

      return {
        marques: sort(marques),
        designations: sort(designations),
        categories: sort(categories),
        emplacements: sort(emplacements),
      };
    },
  });
}
