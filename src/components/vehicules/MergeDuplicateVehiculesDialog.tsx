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
import { Checkbox } from "@/components/ui/checkbox";
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

/** Normalisation forte : majuscule, sans accent, sans espaces/tirets */
const norm = (s: string | null | undefined) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.]/g, "");

/** Format propre pour l'affichage : Première lettre majuscule par mot */
const cleanLabel = (s: string | null | undefined) => {
  const v = (s ?? "").toString().trim();
  if (!v) return "";
  // Marques/modèles courts (≤3 lettres) → tout en majuscules (MG, KIA, BMW)
  if (v.replace(/\s/g, "").length <= 3) return v.toUpperCase();
  return v.toUpperCase();
};

function scoreVehicule(v: Vehicule): number {
  let s = 0;
  if (v.immatriculation && v.immatriculation.trim().length > 3) s += 3;
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"select" | "confirm">("select");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedKeys(new Set());
    setStep("select");
    supabase
      .from("vehicules")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error("Erreur de chargement: " + error.message);
        setVehicules((data ?? []) as Vehicule[]);
        setLoading(false);
      });
  }, [open]);

  // Groupes par marque + modèle + motorisation (normalisés)
  const groups = useMemo(() => {
    const map = new Map<string, Vehicule[]>();
    for (const v of vehicules) {
      const key = [norm(v.marque), norm(v.modele), norm(v.motorisation)].join("|");
      if (!norm(v.marque) || !norm(v.modele)) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return [...map.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => {
        const sorted = [...list].sort((a, b) => scoreVehicule(b) - scoreVehicule(a));
        return {
          key,
          marque: cleanLabel(sorted[0].marque),
          modele: cleanLabel(sorted[0].modele),
          motorisation: cleanLabel(sorted[0].motorisation),
          list: sorted,
        };
      })
      .sort((a, b) => b.list.length - a.list.length);
  }, [vehicules]);

  // Pré-sélection : groupes où toutes les immatriculations normalisées sont identiques (vrais doublons)
  useEffect(() => {
    const auto = new Set<string>();
    for (const g of groups) {
      const immats = new Set(g.list.map((v) => norm(v.immatriculation)));
      if (immats.size === 1) auto.add(g.key);
    }
    setSelectedKeys(auto);
  }, [groups]);

  const toggle = (key: string) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleAll = () => {
    if (selectedKeys.size === groups.length) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(groups.map((g) => g.key)));
  };

  const selectedGroups = groups.filter((g) => selectedKeys.has(g.key));
  const totalToMerge = selectedGroups.reduce((s, g) => s + (g.list.length - 1), 0);

  const runMerge = async () => {
    if (selectedGroups.length === 0) return;
    setBusy(true);
    try {
      let mergedCount = 0;
      for (const g of selectedGroups) {
        const [winner, ...losers] = g.list;
        const loserIds = losers.map((l) => l.id);

        // 0) Uniformiser les libellés du gagnant (casse cohérente)
        await supabase
          .from("vehicules")
          .update({
            marque: g.marque,
            modele: g.modele,
            motorisation: g.motorisation || null,
          })
          .eq("id", winner.id);

        // 1) Réassigner les références
        await supabase.from("stock_movements").update({ vehicule_id: winner.id }).in("vehicule_id", loserIds);
        await supabase.from("stock_exits").update({ vehicule_id: winner.id }).in("vehicule_id", loserIds);

        // 2) article_vehicules : éviter doublons (article_id, vehicule_id)
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

      toast.success(`Fusion terminée : ${mergedCount} véhicule(s) fusionné(s)`);
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            {step === "select"
              ? "Fusionner les doublons (véhicules)"
              : "Confirmer la fusion"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" ? (
              <>
                Détection par <strong>marque + modèle + motorisation</strong> (insensible à la casse et aux accents).
                Cochez les groupes à fusionner. ⚠️ Si plusieurs véhicules physiques distincts partagent
                marque/modèle, ne cochez pas le groupe.
              </>
            ) : (
              <>
                Vérifiez ci-dessous les <strong>valeurs normalisées</strong> qui seront appliquées au véhicule
                conservé de chaque groupe. Toutes les références (mouvements, sorties, compatibilités)
                seront réassignées avant suppression des doublons.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Analyse en cours…</div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            Aucun doublon détecté.
          </div>
        ) : step === "select" ? (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>
                  <strong>{groups.length}</strong> groupe(s) — <strong>{totalToMerge}</strong> à fusionner
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedKeys.size === groups.length ? "Tout décocher" : "Tout cocher"}
              </Button>
            </div>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-3">
                {groups.map((g) => {
                  const checked = selectedKeys.has(g.key);
                  return (
                    <div key={g.key} className="rounded-md border p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(g.key)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {g.marque} {g.modele}
                            {g.motorisation && (
                              <span className="text-muted-foreground font-normal"> · {g.motorisation}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {g.list.length} entrées détectées
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 pl-6">
                        {g.list.map((v, idx) => (
                          <div key={v.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="truncate">
                              <span className="font-mono">{v.immatriculation || "—"}</span>
                              <span className="text-muted-foreground">
                                {" · "}
                                {v.marque} {v.modele}
                                {v.motorisation ? ` · ${v.motorisation}` : ""}
                                {v.annee ? ` · ${v.annee}` : ""}
                              </span>
                            </div>
                            {idx === 0 ? (
                              <Badge variant="default" className="text-[10px]">Conservé</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Fusionné</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-3">
              {selectedGroups.map((g) => {
                const winner = g.list[0];
                return (
                  <div key={g.key} className="rounded-md border p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Groupe — {g.list.length - 1} doublon(s) supprimé(s)
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Marque</span>
                      <span className="font-mono font-semibold">{g.marque}</span>

                      <span className="text-muted-foreground">Modèle</span>
                      <span className="font-mono font-semibold">{g.modele}</span>

                      <span className="text-muted-foreground">Motorisation</span>
                      <span className="font-mono">{g.motorisation || <span className="text-muted-foreground italic">(aucune)</span>}</span>

                      <span className="text-muted-foreground">Immat. conservée</span>
                      <span className="font-mono">{winner.immatriculation || "—"}</span>
                    </div>

                    <div className="border-t pt-2">
                      <div className="text-[11px] text-muted-foreground mb-1">Valeurs originales fusionnées :</div>
                      <div className="space-y-0.5">
                        {g.list.map((v, idx) => (
                          <div key={v.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">
                              <span className="font-mono">{v.immatriculation || "—"}</span>
                              <span className="text-muted-foreground">
                                {" · "}{v.marque} {v.modele}
                                {v.motorisation ? ` · ${v.motorisation}` : ""}
                              </span>
                            </span>
                            {idx === 0 ? (
                              <Badge variant="default" className="text-[10px]">Conservé</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Supprimé</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {step === "select" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Annuler
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={loading || totalToMerge === 0}
              >
                Vérifier la fusion ({totalToMerge})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("select")} disabled={busy}>
                Retour
              </Button>
              <Button onClick={runMerge} disabled={busy || totalToMerge === 0}>
                {busy ? "Fusion…" : `Confirmer et fusionner ${totalToMerge} véhicule(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
