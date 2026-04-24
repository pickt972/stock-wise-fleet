import { useEffect, useMemo, useState } from "react";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Champ à fusionner */
  field: "marque" | "modele";
  /** Valeurs distinctes existantes */
  values: string[];
}

/**
 * Outil de fusion : sélectionne une valeur source à renommer
 * vers une valeur cible. Met à jour véhicules + articles (marque) en cascade.
 */
export function MergeVehiculeFieldDialog({ open, onOpenChange, field, values }: Props) {
  const qc = useQueryClient();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<{ vehicules: number; articles: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setFrom("");
      setTo("");
      setCounts(null);
    }
  }, [open]);

  const targetSuggestions = useMemo(
    () => values.filter((v) => v.toLowerCase() !== from.toLowerCase()),
    [values, from]
  );

  // Compter l'impact
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!from) {
        setCounts(null);
        return;
      }
      const { count: vCount } = await supabase
        .from("vehicules")
        .select("id", { count: "exact", head: true })
        .eq(field, from);

      let aCount = 0;
      if (field === "marque") {
        const { count } = await supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("marque", from);
        aCount = count ?? 0;
      }
      if (!cancel) setCounts({ vehicules: vCount ?? 0, articles: aCount });
    })();
    return () => {
      cancel = true;
    };
  }, [from, field]);

  const run = async () => {
    const target = to.trim();
    if (!from || !target) {
      toast.error("Choisissez une valeur source et une cible");
      return;
    }
    if (target.toLowerCase() === from.toLowerCase()) {
      toast.error("La cible doit être différente de la source");
      return;
    }
    setBusy(true);
    try {
      // 1) Véhicules
      const { error: vErr } = await supabase
        .from("vehicules")
        .update({ [field]: target } as any)
        .eq(field, from);
      if (vErr) throw vErr;

      // 2) Articles (uniquement pour la marque, qui est un champ texte libre)
      if (field === "marque") {
        const { error: aErr } = await supabase
          .from("articles")
          .update({ marque: target })
          .eq("marque", from);
        if (aErr) throw aErr;
      }

      toast.success(
        `Fusion "${from}" → "${target}" effectuée${
          counts ? ` (${counts.vehicules} véhicule(s)${field === "marque" ? `, ${counts.articles} article(s)` : ""})` : ""
        }`
      );

      qc.invalidateQueries({ queryKey: ["vehicules"] });
      qc.invalidateQueries({ queryKey: ["vehicule-suggestions"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Échec de la fusion : " + (e.message ?? "erreur inconnue"));
    } finally {
      setBusy(false);
    }
  };

  const label = field === "marque" ? "marques" : "modèles";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Fusionner des {label}
          </DialogTitle>
          <DialogDescription>
            Renomme toutes les occurrences d'une valeur vers une autre. Les enregistrements liés sont mis à jour automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Valeur à fusionner (source)</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={`Choisir une valeur parmi les ${label} existantes`} />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nouvelle valeur (cible)</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Saisir ou choisir ci-dessous"
              className="h-11"
              list="merge-targets"
            />
            <datalist id="merge-targets">
              {targetSuggestions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            {targetSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {targetSuggestions.slice(0, 8).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTo(v)}
                    className="px-3 py-1.5 rounded-full border bg-secondary text-secondary-foreground text-xs hover:bg-accent"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {counts && (
            <div className="rounded-md bg-muted/40 border p-3 text-sm">
              Impact : <strong>{counts.vehicules}</strong> véhicule(s)
              {field === "marque" && (
                <>
                  {" "}
                  et <strong>{counts.articles}</strong> article(s) seront renommés.
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={run} disabled={busy || !from || !to.trim()}>
            {busy ? "Fusion…" : "Fusionner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
