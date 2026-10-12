import { useEffect, useMemo, useState } from "react";
import { Car, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export interface OrderVehicle { id: string; immatriculation: string; marque: string; modele: string; annee?: number | null }
export interface NewOrderLine { categorie: string; sous_categorie: string | null; vehicule: OrderVehicle | null; vehicule_libre: string | null; quantite: number; precision: string }

const NONE = "__none__";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const vehicleShort = (v: OrderVehicle) => `${v.immatriculation} — ${v.marque} ${v.modele}`;

/** Format d'un véhicule saisi librement : MARQUE en majuscules, modèle en Title Case. */
export const formatFreeVehicle = (raw: string) => {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return raw.trim();
  const cap = (w: string) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);
  return [words[0].toUpperCase(), ...words.slice(1).map(cap)].join(" ");
};

/** One order line = catégorie (required) + sous-catégorie + véhicule + quantité (+ précision). */
export function OrderLineForm({ onAdd }: { onAdd: (l: NewOrderLine) => void }) {
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [vehicles, setVehicles] = useState<OrderVehicle[]>([]);
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState(NONE);
  const [vehicle, setVehicle] = useState<OrderVehicle | null>(null);
  const [freeVehicle, setFreeVehicle] = useState<string | null>(null);
  const [vq, setVq] = useState("");
  const [vOpen, setVOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [precision, setPrecision] = useState("");

  useEffect(() => {
    supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom")
      .then(({ data }) => setCats((data as any) || []));
    supabase.from("vehicules").select("id, immatriculation, marque, modele, annee").eq("actif", true).order("immatriculation")
      .then(({ data }) => setVehicles((data as any) || []));
  }, []);

  const roots = cats.filter((c) => !c.parent_id);
  const subs = cats.filter((c) => c.parent_id && c.parent_id === roots.find((r) => r.nom === cat)?.id);
  const vResults = useMemo(() => {
    const t = norm(vq);
    return (t ? vehicles.filter((v) => norm(`${v.immatriculation}${v.marque}${v.modele}${v.annee ?? ""}`).includes(t)) : vehicles).slice(0, 20);
  }, [vq, vehicles]);

  const q = parseInt(qty, 10);
  const valid = !!cat && q >= 1;
  const add = () => {
    if (!valid) return;
    onAdd({ categorie: cat, sous_categorie: sub === NONE ? null : sub, vehicule: vehicle, vehicule_libre: vehicle ? null : freeVehicle, quantite: q, precision: precision.trim() });
    setSub(NONE); setVehicle(null); setFreeVehicle(null); setVq(""); setQty("1"); setPrecision("");
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_5.5rem_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Catégorie *</Label>
          <Select value={cat} onValueChange={(v) => { setCat(v); setSub(NONE); }}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>{roots.map((r) => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Sous-catégorie</Label>
          <Select value={sub} onValueChange={setSub} disabled={subs.length === 0}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {subs.map((s) => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative col-span-2 lg:col-span-1">
          <Label className="text-xs">Véhicule</Label>
          {freeVehicle ? (
            <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted px-3 text-sm">
              <span className="flex items-center gap-1.5 min-w-0"><Car className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{freeVehicle}</span></span>
              <button type="button" aria-label="Retirer le véhicule" onClick={() => setFreeVehicle(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : vehicle ? (
            <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 text-sm">
              <span className="flex items-center gap-1.5 min-w-0"><Car className="h-4 w-4 text-accent shrink-0" /><span className="truncate">{vehicleShort(vehicle)}</span></span>
              <button type="button" aria-label="Retirer le véhicule" onClick={() => setVehicle(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <Input value={vq} onChange={(e) => { setVq(e.target.value); setVOpen(true); }} onFocus={() => setVOpen(true)}
                onBlur={() => setTimeout(() => setVOpen(false), 150)} placeholder="Immat. ou modèle (optionnel)" className="bg-background" />
              {vOpen && (vResults.length > 0 || vq.trim()) && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                  {vResults.map((v) => (
                    <button key={v.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setVehicle(v); setVOpen(false); setVq(""); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60">
                      {v.immatriculation} — {v.marque} {v.modele}{v.annee ? ` ${v.annee}` : ""}
                    </button>
                  ))}
                  {vq.trim() && !vehicles.some((v) => norm(v.immatriculation) === norm(vq) || norm(`${v.marque}${v.modele}`) === norm(vq)) && (
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setFreeVehicle(formatFreeVehicle(vq.trim())); setVOpen(false); setVq(""); }}
                      className="block w-full border-t px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted/60">
                      ➕ Utiliser « {vq.trim()} » comme véhicule libre
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Véhicule de la flotte ou saisie libre (ex : BYD Atto 3)</p>
        </div>
        <div>
          <Label className="text-xs">Qté *</Label>
          <Input type="number" inputMode="numeric" min="1" value={qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(e.target.value)} className="bg-background" />
        </div>
        <Button type="submit" disabled={!valid}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
      </div>
      <Input value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="Précision (optionnel) : côté avant gauche, urgent…" className="h-8 text-sm bg-background" />
    </form>
  );
}
