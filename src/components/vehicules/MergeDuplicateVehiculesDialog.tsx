import { useEffect, useMemo, useState } from "react";
import { Merge, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Vehicule = Tables<"vehicules">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toString().trim().toUpperCase().replace(/[\s\-_.]/g, "");

/** Score un véhicule : plus c'est complet et récent, plus il est conservé. */
function scoreVehicule(v: Vehicule): number {
  let s = 0;
  if (v.marque) s += 2;
  if (v.modele) s += 2;
  if (v.motorisation) s += 1;
  if (v.annee) s += 1;
  if (v.notes) s += 1;
  if (v.actif) s += 1;
  s += new Date(v.updated_at).getTime() / 1e12;
  return s;
}

export function MergeDuplicateVehiculesDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("vehicules")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error("Erreur de chargement: " + error.message);
        setVehicules((data ?? []) as Vehicule[]);
        setLoading(false);
      });
  }, [open]);

  // Groupes de doublons (par immatriculation normalisée)
  const groups = useMemo(() => {
    const map = new Map<string, Vehicule[]>();
    for (const v of vehicules) {
      const key = norm(v.immatriculation);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return [...map.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({
        key,
        list: [...list].sort((a, b) => scoreVehicule(b) - scoreVehicule(a)),
      }));
  }, [vehicules]);

  const totalDuplicates = groups.reduce((s, g) => s + (g.list.length - 1), 0);

  const runMerge = async () => {
    if (groups.length === 0) return;
    setBusy(true);
    try {
      let mergedCount = 0;
      for (const g of groups) {
        const [winner, ...losers] = g.list;
        const loserIds = losers.map((l) => l.id);

        // 1) Réassigner les références aux véhicules perdants
        await supabase.from("stock_movements").update({ vehicule_id: winner.id }).in("vehicule_id", loserIds);
        await supabase.from("stock_exits").update({ vehicule_id: winner.id }).in("vehicule_id", loserIds);

        // 2) article_vehicules : éviter les doublons (article_id, vehicule_id)
        const { data: avLinks } = await supabase
          .from("article_vehicules")
          .select("id, article_id")
          .in("vehicule_id", loserIds);

        const { data: existing } = await supabase
          .from("article_vehicules")
          .select("article_id")
          .eq("vehicule_id", winner.id);

        const existingArticles = new Set((existing ?? []).map((r) => r.article_id));
        const toUpdate: string[] = [];
        const toDelete: string[] = [];
        for (const link of avLinks ?? []) {
          if (existingArticles.has(link.article_id)) toDelete.push(link.id);
          else {
            toUpdate.push(link.id);
            existingArticles.add(link.article_id);
          }
        }
        if (toUpdate.length) {
          await supabase.from("article_vehicules").update({ vehicule_id: winner.id }).in("id", toUpdate);
        }
        if (toDelete.length) {
          await supabase.from("article_vehicules").delete().in("id", toDelete);
        }

        // 3) Supprimer les véhicules perdants
        const { error: delErr } = await supabase.from("vehicules").delete().in("id", loserIds);
        if (delErr) throw delErr;

        mergedCount += losers.length;
      }

      toast.success(`Fusion terminée : ${mergedCount} doublon(s) supprimé(s)`);
      qc.invalidateQueries({ queryKey: ["vehicules"] });
      qc.invalidateQueries({ queryKey: ["vehicule-suggestions"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Échec de la fusion : " + (e.message ?? "erreur inconnue"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Fusionner les doublons (véhicules)
          </DialogTitle>
          <DialogDescription>
            Détection automatique par immatriculation. Le véhicule le plus complet et le plus récent est conservé,
            les autres sont fusionnés puis supprimés. Les pièces compatibles, sorties et mouvements liés sont reportés.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Analyse en cours…</div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            Aucun doublon détecté.
          </div>
        ) : (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>
                <strong>{groups.length}</strong> groupe(s) de doublons — <strong>{totalDuplicates}</strong> véhicule(s)
                seront supprimés.
              </span>
            </div>
            <ScrollArea className="max-h-[320px] pr-2">
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.key} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground mb-2">Immatriculation : {g.list[0].immatriculation}</div>
                    <div className="space-y-1.5">
                      {g.list.map((v, idx) => (
                        <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="truncate">
                            <span className="font-medium">{v.marque}</span> {v.modele}
                            {v.motorisation && <span className="text-muted-foreground"> · {v.motorisation}</span>}
                            {v.annee && <span className="text-muted-foreground"> · {v.annee}</span>}
                          </div>
                          {idx === 0 ? (
                            <Badge variant="default">Conservé</Badge>
                          ) : (
                            <Badge variant="secondary">Fusionné</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={runMerge} disabled={busy || loading || groups.length === 0}>
            {busy ? "Fusion…" : `Fusionner ${totalDuplicates} doublon(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
