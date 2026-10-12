import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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

export const formatBrand = (raw: string) => raw.trim().replace(/\s+/g, " ").toUpperCase();
export const formatModel = (raw: string) =>
  raw.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");

function AutoField({ label, value, onChange, options, placeholder, format }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string; format: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const t = norm(value);
  const list = options.filter((o) => !t || norm(o).includes(t)).slice(0, 15);
  return (
    <div className="relative min-w-0">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); if (value.trim()) onChange(format(value)); }}
        placeholder={placeholder} className="h-11 bg-background" />
      {open && list.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {list.map((o) => (
            <button key={o} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** One order line = catégorie (required) + sous-catégorie + marque/modèle + quantité (+ précision). */
export function OrderLineForm({ onAdd }: { onAdd: (l: NewOrderLine) => void }) {
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [vehicles, setVehicles] = useState<OrderVehicle[]>([]);
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState(NONE);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
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
  const brands = useMemo(() => [...new Set(vehicles.map((v) => formatBrand(v.marque || "")).filter(Boolean))].sort(), [vehicles]);
  const models = useMemo(() => {
    const b = norm(brand);
    return [...new Set(vehicles.filter((v) => !b || norm(v.marque || "") === b).map((v) => formatModel(v.modele || "")).filter(Boolean))].sort();
  }, [vehicles, brand]);

  const q = parseInt(qty, 10);
  const valid = !!cat && q >= 1;
  const add = () => {
    if (!valid) return;
    const label = [formatBrand(brand), formatModel(model)].filter(Boolean).join(" ");
    onAdd({ categorie: cat, sous_categorie: sub === NONE ? null : sub, vehicule: null, vehicule_libre: label || null, quantite: q, precision: precision.trim() });
    setSub(NONE); setBrand(""); setModel(""); setQty("1"); setPrecision("");
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_5.5rem_auto] gap-2 items-end">
        <div className="min-w-0">
          <Label className="text-xs">Catégorie *</Label>
          <Select value={cat} onValueChange={(v) => { setCat(v); setSub(NONE); }}>
            <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>{roots.map((r) => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Sous-catégorie</Label>
          <Select value={sub} onValueChange={setSub} disabled={subs.length === 0}>
            <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {subs.map((s) => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <AutoField label="MARQUE" value={brand} onChange={setBrand} options={brands} placeholder="Ex: RENAULT, BYD, FORD..." format={formatBrand} />
        <AutoField label="Modèle" value={model} onChange={setModel} options={models} placeholder="Ex: Clio 4, Atto 3, Fiesta..." format={formatModel} />
        <div>
          <Label className="text-xs">Qté *</Label>
          <Input type="number" inputMode="numeric" min="1" value={qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(e.target.value)} className="h-11 bg-background" />
        </div>
        <Button type="submit" disabled={!valid} className="h-11"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
      </div>
      <Input value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="Précision (optionnel) : côté avant gauche, urgent…" className="h-8 text-sm bg-background" />
    </form>
  );
}
