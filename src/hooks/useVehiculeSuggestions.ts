import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère les valeurs distinctes existantes pour les champs véhicules
 * afin d'alimenter l'autocomplétion et limiter les doublons.
 */
export function useVehiculeSuggestions() {
  return useQuery({
    queryKey: ["vehicule-suggestions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("marque, modele, motorisation");
      if (error) throw error;

      const marques = new Set<string>();
      const modeles = new Set<string>();
      const motorisations = new Set<string>();
      (data ?? []).forEach((v) => {
        if (v.marque) marques.add(v.marque.trim());
        if (v.modele) modeles.add(v.modele.trim());
        if (v.motorisation) motorisations.add(v.motorisation.trim());
      });

      const sort = (s: Set<string>) =>
        Array.from(s).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

      return {
        marques: sort(marques),
        modeles: sort(modeles),
        motorisations: sort(motorisations),
      };
    },
  });
}
