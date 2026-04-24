import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Check, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useVehiculeSuggestions } from "@/hooks/useVehiculeSuggestions";
import { LicensePlateScanner } from "./LicensePlateScanner";

type FormData = {
  marque: string;
  modele: string;
  motorisation: string;
  immatriculation: string;
  annee: string;
  notes: string;
  actif: boolean;
};

const EMPTY: FormData = {
  marque: "",
  modele: "",
  motorisation: "",
  immatriculation: "",
  annee: "",
  notes: "",
  actif: true,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<FormData> & { id?: string };
  onSaved?: (id: string) => void;
}

const formatPlate = (v: string) => {
  const c = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let out = "";
  for (let i = 0; i < c.length && i < 7; i++) {
    if (i === 2 || i === 5) out += "-";
    out += c[i];
  }
  return out;
};
const validPlate = (v: string) => /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/.test(v);

/**
 * Assistant en entonnoir : Marque → Modèle → Motorisation → Immat → Détails.
 * Optimisé mobile : grandes cibles tactiles, sélections rapides depuis l'existant.
 */
export function VehiculeWizard({ open, onOpenChange, initial, onSaved }: Props) {
  const { user } = useAuth();
  const { data: sug } = useVehiculeSuggestions();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({ ...EMPTY, ...(initial as any) });
  const [saving, setSaving] = useState(false);

  const editingId = initial?.id;

  // Filtrage contextuel : modèles déjà associés à la marque, motorisations à modèle
  const modeleSug = useMemo(() => sug?.modeles ?? [], [sug]);
  const motoSug = useMemo(() => sug?.motorisations ?? [], [sug]);

  const reset = () => {
    setStep(0);
    setData({ ...EMPTY, ...(initial as any) });
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const canNext = () => {
    if (step === 0) return data.marque.trim().length > 0;
    if (step === 1) return data.modele.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return validPlate(data.immatriculation);
    return true;
  };

  const save = async () => {
    if (!validPlate(data.immatriculation)) {
      toast.error("Immatriculation invalide (AA-000-AA)");
      setStep(3);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        marque: data.marque.trim(),
        modele: data.modele.trim(),
        motorisation: data.motorisation.trim() || null,
        immatriculation: data.immatriculation,
        annee: data.annee ? parseInt(data.annee) : null,
        notes: data.notes || null,
        actif: data.actif,
      };
      if (editingId) {
        const { error } = await supabase.from("vehicules").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Véhicule modifié");
        onSaved?.(editingId);
      } else {
        const { data: ins, error } = await supabase
          .from("vehicules")
          .insert({ ...payload, user_id: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Véhicule créé");
        onSaved?.(ins.id);
      }
      close(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const Chips = ({ items, value, onPick }: { items: string[]; value: string; onPick: (s: string) => void }) => {
    const q = value.trim().toLowerCase();
    const list = (q
      ? items.filter((i) => i.toLowerCase().includes(q) && i.toLowerCase() !== q)
      : items
    ).slice(0, 12);
    if (list.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {list.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="px-3 py-2 rounded-full border bg-secondary text-secondary-foreground text-sm hover:bg-accent transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  const titles = ["Marque", "Modèle", "Motorisation", "Immatriculation", "Détails"];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Modifier le véhicule" : "Nouveau véhicule"} — {titles[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5 mb-4">
          {titles.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="space-y-4 min-h-[220px]">
          {step === 0 && (
            <div className="space-y-2">
              <Label htmlFor="w-marque">Marque du véhicule</Label>
              <Input
                id="w-marque"
                autoFocus
                value={data.marque}
                onChange={(e) => setData((p) => ({ ...p, marque: e.target.value }))}
                placeholder="Peugeot, Renault…"
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">Touchez une marque existante pour éviter les doublons.</p>
              <Chips
                items={sug?.marques ?? []}
                value={data.marque}
                onPick={(s) => setData((p) => ({ ...p, marque: s }))}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="w-modele">Modèle ({data.marque})</Label>
              <Input
                id="w-modele"
                autoFocus
                value={data.modele}
                onChange={(e) => setData((p) => ({ ...p, modele: e.target.value }))}
                placeholder="208, Clio…"
                className="h-12 text-base"
              />
              <Chips
                items={modeleSug}
                value={data.modele}
                onPick={(s) => setData((p) => ({ ...p, modele: s }))}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="w-moto">Motorisation (optionnel)</Label>
              <Input
                id="w-moto"
                autoFocus
                value={data.motorisation}
                onChange={(e) => setData((p) => ({ ...p, motorisation: e.target.value }))}
                placeholder="1.5 dCi, Essence, Électrique…"
                className="h-12 text-base"
              />
              <Chips
                items={motoSug}
                value={data.motorisation}
                onPick={(s) => setData((p) => ({ ...p, motorisation: s }))}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="w-immat">Immatriculation</Label>
              <div className="flex gap-2">
                <Input
                  id="w-immat"
                  autoFocus
                  value={data.immatriculation}
                  onChange={(e) =>
                    setData((p) => ({ ...p, immatriculation: formatPlate(e.target.value) }))
                  }
                  placeholder="AB-123-CD"
                  maxLength={9}
                  className={cn(
                    "h-12 text-base flex-1 tracking-wider",
                    data.immatriculation && !validPlate(data.immatriculation) && "border-destructive"
                  )}
                />
                <LicensePlateScanner
                  onPlateDetected={(plate) =>
                    setData((p) => ({ ...p, immatriculation: formatPlate(plate) }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ScanLine className="h-3 w-3" /> Format AA-000-AA — utilisez le scanner de plaque pour gagner du temps.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/30">
                <div><span className="text-muted-foreground">Marque :</span> <strong>{data.marque}</strong></div>
                <div><span className="text-muted-foreground">Modèle :</span> <strong>{data.modele}</strong></div>
                {data.motorisation && (
                  <div><span className="text-muted-foreground">Motorisation :</span> {data.motorisation}</div>
                )}
                <div><span className="text-muted-foreground">Immat :</span> {data.immatriculation}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-annee">Année (optionnel)</Label>
                <Input
                  id="w-annee"
                  type="number"
                  inputMode="numeric"
                  value={data.annee}
                  onChange={(e) => setData((p) => ({ ...p, annee: e.target.value }))}
                  placeholder="2020"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-notes">Notes (optionnel)</Label>
                <Textarea
                  id="w-notes"
                  value={data.notes}
                  onChange={(e) => setData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Informations complémentaires…"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="w-actif"
                  checked={data.actif}
                  onCheckedChange={(c) => setData((p) => ({ ...p, actif: c }))}
                />
                <Label htmlFor="w-actif">Véhicule actif</Label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 0 ? close(false) : setStep((s) => s - 1))}
            className="h-12"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "Annuler" : "Retour"}
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="h-12 flex-1"
            >
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={save} disabled={saving} className="h-12 flex-1">
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
