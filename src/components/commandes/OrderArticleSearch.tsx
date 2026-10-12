import { useEffect, useMemo, useState } from "react";
import { Search, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
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

const ALL = "__all__";

export function stockTone(stock = 0, min = 0) {
  if (stock <= 0) return { label: "Rupture", cls: "text-destructive font-semibold" };
  if (stock <= min) return { label: `⚠️ ${stock}`, cls: "text-warning font-semibold" };
  return { label: String(stock), cls: "text-success font-semibold" };
}

export function OrderArticleSearch({
  articles,
  onSelect,
  onScanClick,
}: {
  articles: OrderSearchArticle[];
  onSelect: (a: OrderSearchArticle) => void;
  onScanClick?: () => void;
}) {
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [cat, setCat] = useState(ALL);
  const [sub, setSub] = useState(ALL);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, nom, parent_id")
      .eq("actif", true)
      .order("sort_order")
      .order("nom")
      .then(({ data }) => setCats((data as any) || []));
  }, []);

  const roots = cats.filter((c) => !c.parent_id);
  const rootId = roots.find((r) => r.nom === cat)?.id;
  const subs = cats.filter((c) => c.parent_id && c.parent_id === rootId);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = cat === ALL && term.length < 2 ? [] : articles.filter((a) => {
      if (cat !== ALL && a.categorie !== cat) return false;
      if (sub !== ALL && (a.sous_categorie || "").trim() !== sub) return false;
      if (term.length < 2) return true;
      return `${a.designation} ${a.reference} ${a.marque ?? ""} ${a.categorie ?? ""} ${a.sous_categorie ?? ""}`
        .toLowerCase()
        .includes(term);
    });
    const groups = new Map<string, OrderSearchArticle[]>();
    filtered.slice(0, 80).forEach((a) => {
      const k = a.categorie || "Sans catégorie";
      groups.set(k, [...(groups.get(k) || []), a]);
    });
    return Array.from(groups.entries());
  }, [articles, q, cat, sub]);

  const show = open && results.length > 0;

  return (
    <div className="space-y-2 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={cat} onValueChange={(v) => { setCat(v); setSub(ALL); setOpen(true); }}>
          <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les catégories</SelectItem>
            {roots.map((r) => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        {cat !== ALL && subs.length > 0 && (
          <Select value={sub} onValueChange={(v) => { setSub(v); setOpen(true); }}>
            <SelectTrigger><SelectValue placeholder="Sous-catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les sous-catégories</SelectItem>
              {subs.map((s) => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Désignation, référence, marque, catégorie…"
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
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { onSelect(a); setQ(""); setOpen(false); }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    >
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
    </div>
  );
}
