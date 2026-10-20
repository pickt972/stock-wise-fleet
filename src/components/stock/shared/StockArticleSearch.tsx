import { useMemo } from "react";
import { Camera, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entryFilterOptions, entryStockStatus, filterEntryArticles, type EntrySearchArticle } from "@/lib/entryArticleSearch";
const NONE = "__none__";
interface Props<T> {
  articles: T[]; loading: boolean; loadFailed: boolean; search: string; setSearch: (v: string) => void;
  filterCategory: string; setFilterCategory: (v: string) => void;
  filterSubcategory: string; setFilterSubcategory: (v: string) => void;
  filterBrand: string; setFilterBrand: (v: string) => void;
  scannedCode: string | null; setScannedCode: (v: string | null) => void;
  onPick: (article: T) => void; onCreate: () => void; onScan: () => void;
}
export function StockArticleSearch<T extends EntrySearchArticle & { id: string }>({ articles, loading, loadFailed, search, setSearch, filterCategory, setFilterCategory, filterSubcategory, setFilterSubcategory, filterBrand, setFilterBrand, scannedCode, setScannedCode, onPick, onCreate, onScan }: Props<T>) {
  const options = useMemo(() => entryFilterOptions(articles, filterCategory, filterSubcategory), [articles, filterCategory, filterSubcategory]);
  const results = useMemo(() => filterEntryArticles(articles, { category: filterCategory, subcategory: filterSubcategory, brand: filterBrand }, search, scannedCode), [search, articles, scannedCode, filterCategory, filterSubcategory, filterBrand]);
  return (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 min-w-0"><Label className="text-xs">Catégorie</Label>
                  <Select value={filterCategory || NONE} disabled={loading || loadFailed} onValueChange={(v) => { setFilterCategory(v === NONE ? "" : v); setFilterSubcategory(""); setFilterBrand(""); setScannedCode(null); }}>
                    <SelectTrigger aria-label="Filtrer par catégorie"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Toutes</SelectItem>{options.categories.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-0"><Label className="text-xs">Sous-catégorie</Label>
                  <Select value={filterSubcategory || NONE} disabled={loading || !filterCategory} onValueChange={(v) => { setFilterSubcategory(v === NONE ? "" : v); setFilterBrand(""); setScannedCode(null); }}>
                    <SelectTrigger aria-label="Filtrer par sous-catégorie"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Toutes</SelectItem>{options.subcategories.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-0"><Label className="text-xs">Marque</Label>
                  <Select value={filterBrand || NONE} disabled={loading || !filterCategory} onValueChange={(v) => { setFilterBrand(v === NONE ? "" : v); setScannedCode(null); }}>
                    <SelectTrigger aria-label="Filtrer par marque"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={NONE}>Toutes</SelectItem>{options.brands.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus disabled={loading || loadFailed} aria-label="Rechercher un article" value={search} onChange={(e) => { setSearch(e.target.value); setScannedCode(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && results.length === 1) onPick(results[0]); }}
                    placeholder="Référence, nom, catégorie ou code-barres"
                    className="pl-9 h-12"
                  />
                </div>
                <Button type="button" variant="outline" disabled={loading} className="h-12 w-12 p-0" onClick={() => onScan()} aria-label="Scanner">
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {loading && <p role="status" className="text-sm text-muted-foreground text-center py-4">Chargement des articles…</p>}
                {results.map((a) => (
                  <Button key={a.id} type="button" variant="outline" onClick={() => onPick(a)}
                    className="w-full h-auto justify-between gap-3 text-left p-3 whitespace-normal">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm break-words">{a.designation}</div>
                      <div className="text-xs text-muted-foreground break-words">{a.reference} · {a.marque || "Sans marque"} · Stock : {a.stock}</div>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${entryStockStatus(a.stock, a.stock_min) === "empty" ? "bg-destructive/10 text-destructive" : entryStockStatus(a.stock, a.stock_min) === "low" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {entryStockStatus(a.stock, a.stock_min) === "empty" ? "Rupture" : entryStockStatus(a.stock, a.stock_min) === "low" ? "Bas" : "OK"}
                    </span>
                  </Button>
                ))}
                {!loading && !loadFailed && results.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    Aucun article trouvé.{search.trim() ? " Cet article n'existe pas encore. Voulez-vous le créer ?" : ""}
                  </p>
                )}
              </div>
              {!loading && !loadFailed && (
                <div className="border-t pt-1">
                  <Button type="button" variant="ghost" onClick={onCreate} className={`w-full h-auto py-2.5 justify-start text-warning whitespace-normal text-left ${results.length === 0 && search.trim() ? "font-semibold bg-warning/5 hover:bg-warning/10" : "font-medium hover:bg-warning/5"}`}>
                    <Plus className="h-4 w-4 shrink-0 mr-2" />
                    {results.length === 0 && search.trim() ? `Créer l’article « ${search.trim()} »` : "Créer un nouvel article"}
                  </Button>
                </div>
              )}
            </div>
  );
}
