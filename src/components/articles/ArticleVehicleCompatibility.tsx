import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Car, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ArticleVehicleCompatibilityProps {
  articleId: string;
}

// Clé de regroupement: marque + modèle + motorisation (insensible à la casse)
const groupKey = (v: { marque: string; modele: string; motorisation?: string | null }) =>
  `${v.marque.trim().toLowerCase()}|${v.modele.trim().toLowerCase()}|${(v.motorisation ?? "").trim().toLowerCase()}`;

const groupLabel = (v: { marque: string; modele: string; motorisation?: string | null }) =>
  `${v.marque} ${v.modele}${v.motorisation ? ` (${v.motorisation})` : ""}`;

export default function ArticleVehicleCompatibility({ articleId }: ArticleVehicleCompatibilityProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // Regrouper les véhicules disponibles par marque/modèle/motorisation
  const vehiculeGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; vehiculeIds: string[] }>();
    vehicules.forEach((v) => {
      const k = groupKey(v);
      const existing = map.get(k);
      if (existing) {
        existing.vehiculeIds.push(v.id);
      } else {
        map.set(k, { key: k, label: groupLabel(v), vehiculeIds: [v.id] });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [vehicules]);

  // Regrouper les compatibilités existantes par marque/modèle/motorisation
  const compatibilityGroups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      label: string;
      items: Array<{ id: string; notes: string | null; immatriculation: string }>;
    }>();
    compatibilities.forEach((c) => {
      if (!c.vehicules) return;
      const k = groupKey(c.vehicules);
      const label = groupLabel(c.vehicules);
      const item = { id: c.id, notes: c.notes, immatriculation: c.vehicules.immatriculation };
      const existing = map.get(k);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(k, { key: k, label, items: [item] });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [compatibilities]);

  // Groupes déjà associés (pour les filtrer du sélecteur)
  const associatedGroupKeys = useMemo(
    () => new Set(compatibilityGroups.map((g) => g.key)),
    [compatibilityGroups]
  );

  const availableGroups = vehiculeGroups.filter((g) => !associatedGroupKeys.has(g.key));

  const addCompatibilityMutation = useMutation({
    mutationFn: async ({ vehiculeIds, notes }: { vehiculeIds: string[]; notes: string }) => {
      const rows = vehiculeIds.map((vid) => ({
        article_id: articleId,
        vehicule_id: vid,
        notes: notes || null,
        user_id: user?.id,
      }));
      const { error } = await supabase.from("article_vehicules").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité ajoutée avec succès");
      setSelectedGroupKey("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout : " + error.message);
    },
  });

  const removeGroupMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("article_vehicules").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-vehicules", articleId] });
      toast.success("Compatibilité supprimée avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression : " + error.message);
    },
  });

  const handleAddCompatibility = () => {
    if (!selectedGroupKey) {
      toast.error("Veuillez sélectionner un véhicule");
      return;
    }
    if (associatedGroupKeys.has(selectedGroupKey)) {
      toast.error("Ce modèle est déjà associé à cet article");
      return;
    }
    const group = vehiculeGroups.find((g) => g.key === selectedGroupKey);
    if (!group) return;
    addCompatibilityMutation.mutate({ vehiculeIds: group.vehiculeIds, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Compatibilité Véhicules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-hidden">
        <div className="space-y-3">
          <div>
            <Label htmlFor="vehicule-select">Ajouter un modèle de véhicule compatible</Label>
            <SearchableSelect
              id="vehicule-select"
              options={availableGroups.map((g) => ({
                value: g.key,
                label: `${g.label}${g.vehiculeIds.length > 1 ? ` — ${g.vehiculeIds.length} véhicules` : ""}`,
              }))}
              value={selectedGroupKey}
              onValueChange={setSelectedGroupKey}
              placeholder="Sélectionner un modèle"
              searchPlaceholder="Rechercher un modèle..."
              emptyMessage="Aucun modèle disponible."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations spécifiques à cette compatibilité..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleAddCompatibility}
            disabled={!selectedGroupKey || addCompatibilityMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter la compatibilité
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Modèles compatibles :</h4>
          {compatibilityGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune compatibilité définie pour cet article
            </p>
          ) : (
            <div className="space-y-2">
              {compatibilityGroups.map((group) => {
                const ids = group.items.map((i) => i.id);
                const allNotes = Array.from(
                  new Set(group.items.map((i) => i.notes).filter(Boolean) as string[])
                );
                const isOpen = expandedGroups.has(group.key);
                return (
                  <div
                    key={group.key}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="flex-1 min-w-0 flex items-start gap-2 text-left"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit max-w-full break-words whitespace-normal text-xs">
                            {group.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground break-words whitespace-normal">
                            {group.items.length} véhicule{group.items.length > 1 ? "s" : ""} concerné{group.items.length > 1 ? "s" : ""}
                          </span>
                          {allNotes.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {allNotes.join(" • ")}
                            </p>
                          )}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroupMutation.mutate(ids)}
                        disabled={removeGroupMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">
                          Immatriculations :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="font-mono text-xs break-all"
                            >
                              {item.immatriculation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
