import { vehicleLabel } from "@/lib/vehicleFormatting";
import { useEffect, useMemo, useState } from "react";
import { Search, Camera, Car, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryIcon } from "@/components/categories/CategoryIcon";

export interface OrderSearchArticle {
  id: string;
  designation: string;
  reference: string;
  marque?: string | null;
  categorie?: string | null;
  sous_categorie?: string | null;
  stock?: number;
  stock_min?: number;
  prix_achat: number;
}

export interface OrderVehicle { id: string; immatriculation: string; marque: string; modele: string; annee?: number | null }
export interface OrderSearchContext { vehicule: OrderVehicle | null; categorie: string | null; sous_categorie: string | null }

export { vehicleLabel } from "@/lib/vehicleFormatting";

const ALL = "__all__";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function stockTone(stock = 0, min = 0) {
  if (stock <= 0) return { label: "Rupture", cls: "text-destructive font-semibold" };
  if (stock <= min) return { label: `⚠️ ${stock}`, cls: "text-warning font-semibold" };
  return { label: String(stock), cls: "text-success font-semibold" };
}

export function OrderArticleSearch({
  articles,
  onSelect,
  onScanClick,
  onFreeText,
  onUnsure,
}: {
  articles: OrderSearchArticle[];
  onSelect: (a: OrderSearchArticle, ctx: OrderSearchContext) => void;
  onScanClick?: () => void;
  onFreeText?: (text: string, qty: number, price: number, ctx: OrderSearchContext) => void;
  onUnsure?: (ctx: OrderSearchContext) => void;
}) {
  const [mode, setMode] = useState<"categorie" | "vehicule">("categorie");
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [vehicles, setVehicles] = useState<OrderVehicle[]>([]);
  const [vehicle, setVehicle] = useState<OrderVehicle | null>(null);
  const [vq, setVq] = useState("");
  const [vOpen, setVOpen] = useState(false);
  const [vehicleArticleIds, setVehicleArticleIds] = useState<Set<string> | null>(null);
  const [cat, setCat] = useState(ALL);
  const [sub, setSub] = useState(ALL);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ d: string; q: string; p: string } | null>(null);

  useEffect(() => {
    supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom")
      .then(({ data }) => setCats((data as any) || []));
    supabase.from("vehicules").select("id, immatriculation, marque, modele, annee").eq("actif", true).order("immatriculation")
      .then(({ data }) => setVehicles((data as any) || []));
  }, []);

  // Articles linked to the vehicle, or to any vehicle of the same make/model.
  useEffect(() => {
    if (!vehicle) { setVehicleArticleIds(null); return; }
    const ids = vehicles
      .filter((v) => v.id === vehicle.id || (norm(v.marque) === norm(vehicle.marque) && norm(v.modele) === norm(vehicle.modele)))
      .map((v) => v.id);
    supabase.from("article_vehicules").select("article_id").in("vehicule_id", ids)
      .then(({ data }) => setVehicleArticleIds(new Set((data || []).map((r: any) => r.article_id))));
  }, [vehicle, vehicles]);

  const roots = cats.filter((c) => !c.parent_id);
  const rootId = roots.find((r) => r.nom === cat)?.id;
  const subs = cats.filter((c) => c.parent_id && c.parent_id === rootId);

  const ctx: OrderSearchContext = {
    vehicule: mode === "vehicule" ? vehicle : null,
    categorie: cat === ALL ? null : cat,
    sous_categorie: sub === ALL ? null : sub,
  };

  const vehicleResults = useMemo(() => {
    const t = norm(vq);
    if (!t) return vehicles.slice(0, 20);
    return vehicles.filter((v) => norm(`${v.immatriculation}${v.marque}${v.modele}${v.annee ?? ""}`).includes(t)).slice(0, 20);
  }, [vq, vehicles]);

  const filteredAll = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byVehicle = mode === "vehicule" && vehicle;
    if (!byVehicle && cat === ALL && term.length < 2) return [];
    if (mode === "vehicule" && !vehicle) return [];
    return articles.filter((a) => {
      if (byVehicle && !vehicleArticleIds?.has(a.id)) return false;
      if (cat !== ALL && a.categorie !== cat) return false;
      if (sub !== ALL && (a.sous_categorie || "").trim() !== sub) return false;
      if (term.length < 2) return true;
      return `${a.designation} ${a.reference} ${a.marque ?? ""} ${a.categorie ?? ""} ${a.sous_categorie ?? ""}`.toLowerCase().includes(term);
    });
  }, [articles, q, cat, sub, mode, vehicle, vehicleArticleIds]);

  const results = useMemo(() => {
    const groups = new Map<string, OrderSearchArticle[]>();
    filteredAll.slice(0, 80).forEach((a) => {
      const k = a.categorie || "Sans catégorie";
      groups.set(k, [...(groups.get(k) || []), a]);
    });
    return Array.from(groups.entries());
  }, [filteredAll]);

  const vehicleNoMatch = mode === "vehicule" && !!vehicle && vehicleArticleIds !== null && filteredAll.length === 0;
  const show = (open || (mode === "vehicule" && !!vehicle)) && results.length > 0;

  const select = (a: OrderSearchArticle) => { onSelect(a, ctx); setQ(""); setOpen(false); };
  const submitForm = () => {
    if (!form || !onFreeText || !form.d.trim()) return;
    onFreeText(form.d.trim(), Math.max(1, parseInt(form.q, 10) || 1), Math.max(0, parseFloat(form.p.replace(",", ".")) || 0), ctx);
    setForm(null);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="inline-flex rounded-lg border p-1 bg-muted/40" role="tablist">
        {([["categorie", "🔍 Par catégorie"], ["vehicule", "🚗 Par véhicule"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === k ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {mode === "vehicule" && (
        <div className="relative">
          {vehicle ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 min-w-0"><Car className="h-4 w-4 text-primary shrink-0" /><span className="truncate font-medium">{vehicleLabel(vehicle)}</span></span>
              <button type="button" aria-label="Changer de véhicule" onClick={() => { setVehicle(null); setVq(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={vq} onChange={(e) => { setVq(e.target.value); setVOpen(true); }} onFocus={() => setVOpen(true)}
                onBlur={() => setTimeout(() => setVOpen(false), 150)} placeholder="Immatriculation ou marque/modèle…" className="pl-9" />
              {vOpen && vehicleResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                  {vehicleResults.map((v) => (
                    <button key={v.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setVehicle(v); setVOpen(false); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60">{vehicleLabel(v)}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(mode === "categorie" || vehicle) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={cat} onValueChange={(v) => { setCat(v); setSub(ALL); setOpen(true); }}>
            <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les catégories</SelectItem>
              {roots.map((r) => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sub} onValueChange={(v) => { setSub(v); setOpen(true); }} disabled={cat === ALL || subs.length === 0}>
            <SelectTrigger><SelectValue placeholder="Sous-catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les sous-catégories</SelectItem>
              {subs.map((s) => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {(mode === "categorie" || vehicle) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !onFreeText) return;
              e.preventDefault();
              if (filteredAll.length === 1) select(filteredAll[0]);
              else if (q.trim()) { onFreeText(q.trim(), 1, 0, ctx); setQ(""); }
            }}
            placeholder="Désignation, référence, marque…"
            className={onScanClick ? "pl-9 pr-11" : "pl-9"}
          />
          {onScanClick && (
            <button type="button" onClick={onScanClick} aria-label="Scanner un code-barres" title="Scanner un code-barres"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-primary hover:bg-muted">
              <Camera className="h-4 w-4" />
            </button>
          )}
          {show && (
            <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border bg-popover shadow-lg">
              {results.map(([group, items]) => (
                <div key={group}>
                  <div className="sticky top-0 flex items-center gap-2 bg-muted px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span className="h-4 w-4 text-primary [&_svg]:h-4 [&_svg]:w-4">{getCategoryIcon(group)}</span>
                    {group}
                  </div>
                  {items.map((a) => {
                    const t = stockTone(a.stock, a.stock_min);
                    return (
                      <button key={a.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => select(a)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60">
                        <span className="min-w-0 truncate">
                          <span className="font-medium">{a.designation}</span>
                          <span className="text-muted-foreground"> — Réf: {a.reference}{a.marque ? ` — ${a.marque}` : ""}</span>
                        </span>
                        <span className={`shrink-0 text-xs ${t.cls}`}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vehicleNoMatch && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Aucun article enregistré pour ce véhicule dans cette catégorie. Vous pouvez commander sans référence ↓
        </p>
      )}

      {(mode === "categorie" || vehicle) && (
        <div className="flex flex-wrap gap-2">
          {onUnsure && cat !== ALL && (
            <Button type="button" size="sm" variant="outline" className="border-warning/40 text-warning" onClick={() => onUnsure(ctx)}>
              Je ne sais pas laquelle
            </Button>
          )}
          {onFreeText && (
            <Button type="button" size="sm" variant="outline" className="border-primary/40 text-primary"
              onClick={() => { setForm({ d: q.trim(), q: "1", p: "" }); setQ(""); setOpen(false); }}>
              + Commander sans référence
            </Button>
          )}
        </div>
      )}

      {form && (
        <form onSubmit={(e) => { e.preventDefault(); submitForm(); }} className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">Commander sans référence — 📋 À créer à la réception</p>
          <div>
            <Label className="text-xs">Désignation *</Label>
            <Input autoFocus value={form.d} onChange={(e) => setForm({ ...form, d: e.target.value })} placeholder="ex : Plaquettes avant" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>Catégorie : <span className="font-medium text-foreground">{ctx.categorie ? `${ctx.categorie}${ctx.sous_categorie ? ` › ${ctx.sous_categorie}` : ""}` : "—"}</span></p>
            <p>Véhicule : <span className="font-medium text-foreground">{ctx.vehicule ? vehicleLabel(ctx.vehicule) : "—"}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quantité *</Label>
              <Input type="number" inputMode="numeric" min="1" value={form.q} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setForm({ ...form, q: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Prix estimé (€)</Label>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} placeholder="Optionnel" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={!form.d.trim()}>+ Ajouter à la commande</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setForm(null)}>Annuler</Button>
          </div>
        </form>
      )}
    </div>
  );
}
