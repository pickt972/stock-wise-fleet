import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Car } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ArticleVehicleCompatibilityProps {
  articleId: string;
}

const groupKey = (v: { marque: string; modele: string; motorisation?: string | null }) =>
  `${v.marque.trim().toLowerCase()}|${v.modele.trim().toLowerCase()}|${(v.motorisation ?? "").trim().toLowerCase()}`;

const groupLabel = (v: { marque: string; modele: string; motorisation?: string | null }) =>
  `${v.marque} ${v.modele}${v.motorisation ? ` (${v.motorisation})` : ""}`;

export default function ArticleVehicleCompatibility({ articleId }: ArticleVehicleCompatibilityProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("marque", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: compatibilities = [] } = useQuery({
    queryKey: ["article-vehicules", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_vehicules")
        .select(`
          id,
          notes,
          vehicule_id,
          vehicules (
            id,
            marque,
            modele,
            motorisation,
            immatriculation
          )
        `)
        .eq("article_id", articleId);
      if (error) throw error;
      return data;
    },
    enabled: !!articleId,
  });

  // Regrouper les véhicules par marque/modèle/motorisation
  const vehiculeGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; vehiculeIds: string[]; immatriculations: string[] }>();
    vehicules.forEach((v) => {
      const k = groupKey(v);
      const existing = map.get(k);
      if (existing) {
        existing.vehiculeIds.push(v.id);
        existing.immatriculations.push(v.immatriculation);
      } else {
        map.set(k, { key: k, label: groupLabel(v), vehiculeIds: [v.id], immatriculations: [v.immatriculation] });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicules]);

  // Regrouper les compatibilités existantes par marque/modèle/motorisation
  const compatibilityMap = useMemo(() => {
    const map = new Map<string, { ids: string[]; immatriculations: string[] }>();
    compatibilities.forEach((c) => {
      if (!c.vehicules) return;
      const k = groupKey(c.vehicules);
      const existing = map.get(k);
      if (existing) {
        existing.ids.push(c.id);
        existing.immatriculations.push(c.vehicules.immatriculation);
      } else {
        map.set(k, { ids: [c.id], immatriculations: [c.vehicules.immatriculation] });
      }
    });
    return map;
  }, [compatibilities]);

  const addMutation = useMutation({
    mutationFn: async (vehiculeIds: string[]) => {
      const rows = vehiculeIds.map((vid) => ({
        article_id: articleId,
        vehicule_id: vid,
        notes: null,
        user_id: user?.id,
      }));
      const { error } = await supabase.from("article_vehicules").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité ajoutée");
    },
    onError: (error) => {
      toast.error("Erreur : " + error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("article_vehicules").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité retirée");
    },
    onError: (error) => {
      toast.error("Erreur : " + error.message);
    },
  });

  const handleToggle = async (group: { key: string; vehiculeIds: string[] }) => {
    if (pendingKeys.has(group.key)) return;
    const existing = compatibilityMap.get(group.key);
    setPendingKeys((prev) => new Set(prev).add(group.key));
    try {
      if (existing) {
        await removeMutation.mutateAsync(existing.ids);
      } else {
        await addMutation.mutateAsync(group.vehiculeIds);
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(group.key);
        return next;
      });
    }
  };

  const checkedCount = compatibilityMap.size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Compatibilité Véhicules
          {checkedCount > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {checkedCount} modèle{checkedCount > 1 ? "s" : ""} sélectionné{checkedCount > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vehiculeGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun véhicule actif dans la flotte.</p>
        ) : (
          <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
            {vehiculeGroups.map((group) => {
              const isChecked = compatibilityMap.has(group.key);
              const isPending = pendingKeys.has(group.key);
              const compat = compatibilityMap.get(group.key);
              return (
                <label
                  key={group.key}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors select-none ${
                    isChecked
                      ? "bg-primary/8 hover:bg-primary/12"
                      : "hover:bg-muted/60"
                  } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(group)}
                    disabled={isPending}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{group.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.vehiculeIds.length} véhicule{group.vehiculeIds.length > 1 ? "s" : ""}
                      {isChecked && compat && compat.immatriculations.length > 0 && (
                        <span className="ml-1 text-primary/70">
                          · {compat.immatriculations.slice(0, 3).join(", ")}
                          {compat.immatriculations.length > 3 && ` +${compat.immatriculations.length - 3}`}
                        </span>
                      )}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
