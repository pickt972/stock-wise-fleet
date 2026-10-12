import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Package, Search, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryIcon } from "@/components/categories/CategoryIcon";

export { CATEGORY_ICONS } from "@/components/categories/CategoryIcon";

/** Liste de cartes catégorie (icône + nom), partagée par les fiches article et le sélecteur d'article. */
export function CategoryCardGrid({
  items,
  selected,
  onSelect,
  showIcons = true,
  counts,
}: {
  items: string[];
  selected?: string;
  onSelect: (name: string) => void;
  showIcons?: boolean;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-3 ${
            selected === cat
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          {showIcons && <span className="text-primary shrink-0">{getCategoryIcon(cat)}</span>}
          <span className="flex-1">{cat}</span>
          {counts && <span className="text-xs text-muted-foreground">{counts[cat] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}

const NO_SUB = "Sans sous-catégorie";

interface PickerArticle {
  id: string;
  reference: string;
  designation: string;
  marque: string | null;
  categorie: string;
  sous_categorie: string | null;
  stock: number;
}

/** Champ "Article" : ouvre un sélecteur visuel Catégorie → Sous-catégorie → Article. */
export function ArticlePickerField({
  value,
  onChange,
  showStock = false,
}: {
  value: string;
  onChange: (articleId: string) => void;
  showStock?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<PickerArticle[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [a, c] = await Promise.all([
        supabase.from("articles").select("id, reference, designation, marque, categorie, sous_categorie, stock").order("reference"),
        supabase.from("categories").select("nom, parent_id, sort_order").eq("actif", true).is("parent_id", null).order("sort_order").order("nom"),
      ]);
      setArticles((a.data as PickerArticle[]) || []);
      setCategoryOrder((c.data || []).map((x: any) => x.nom));
    })();
  }, []);

  const selected = articles.find((a) => a.id === value);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    articles.forEach((a) => (m[a.categorie] = (m[a.categorie] || 0) + 1));
    return m;
  }, [articles]);

  const cats = useMemo(() => {
    const present = Object.keys(catCounts);
    const ordered = categoryOrder.filter((c) => present.includes(c));
    return [...ordered, ...present.filter((c) => !ordered.includes(c)).sort()];
  }, [catCounts, categoryOrder]);

  const subCounts = useMemo(() => {
    const m: Record<string, number> = {};
    articles.filter((a) => a.categorie === cat).forEach((a) => {
      const k = a.sous_categorie?.trim() || NO_SUB;
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [articles, cat]);

  const subs = Object.keys(subCounts).sort((a, b) => (a === NO_SUB ? 1 : b === NO_SUB ? -1 : a.localeCompare(b)));

  const list = articles.filter(
    (a) => a.categorie === cat && (a.sous_categorie?.trim() || NO_SUB) === sub
  );

  const searchResults = q.trim()
    ? articles.filter((a) =>
        `${a.reference} ${a.designation} ${a.marque ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
      ).slice(0, 50)
    : null;

  const openPicker = () => {
    setCat(null);
    setSub(null);
    setQ("");
    setOpen(true);
  };

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const back = () => (sub ? setSub(null) : setCat(null));

  const ArticleCards = ({ items }: { items: PickerArticle[] }) => (
    <div className="flex flex-col gap-2">
      {items.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => pick(a.id)}
          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
            a.id === value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{a.reference}</span>
            {showStock && <span className="text-xs text-muted-foreground">Stock : {a.stock}</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {a.marque || "—"} · {a.designation}
          </div>
        </button>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun article</p>}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm hover:bg-muted/50"
      >
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        {selected ? (
          <span className="truncate">
            <span className="font-medium">{selected.reference}</span>
            <span className="text-muted-foreground"> · {selected.marque || selected.designation}</span>
            {showStock && <span className="text-muted-foreground"> (stock : {selected.stock})</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">Sélectionner un article...</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(cat || sub) && !searchResults && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={back}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Layers className="h-5 w-5 text-primary" />
              <span className="truncate">
                {searchResults ? "Résultats" : sub ? `${cat} › ${sub}` : cat ? cat : "Choisir une catégorie"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche directe (référence, marque…)" className="pl-9" />
          </div>
          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            {searchResults ? (
              <ArticleCards items={searchResults} />
            ) : !cat ? (
              <CategoryCardGrid items={cats} counts={catCounts} onSelect={setCat} />
            ) : !sub ? (
              <CategoryCardGrid items={subs} counts={subCounts} onSelect={setSub} showIcons={false} />
            ) : (
              <ArticleCards items={list} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
