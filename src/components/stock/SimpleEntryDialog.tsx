import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Minus, PackagePlus, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createStockEntry } from "@/lib/stockEntries";
import { parseSimpleEntryPrice, quickEntryArticle } from "@/lib/simpleEntryInput";
import { isDraftReference } from "@/lib/draftReference";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { entryFilterOptions, entryStockStatus, filterEntryArticles } from "@/lib/entryArticleSearch";

interface Article {
  id: string;
  reference: string;
  designation: string;
  categorie: string;
  sous_categorie: string | null;
  code_barre: string | null;
  stock: number;
  stock_min: number;
  marque: string | null;
  prix_achat: number;
  fournisseur_id: string | null;
  is_draft: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledArticleId?: string;
  initialSearch?: string;
}

const NONE = "__none__";

async function loadEntryArticles(): Promise<Article[]> {
  const all: Article[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("articles")
      .select("id, reference, designation, categorie, sous_categorie, marque, code_barre, stock, stock_min, prix_achat, fournisseur_id, is_draft")
      .is("archived_at", null).order("designation").order("id").range(offset, offset + 999);
    if (error) throw error;
    all.push(...(data || []));
    if ((data || []).length < 1000) return all;
  }
}

export function SimpleEntryDialog({ open, onOpenChange, onSuccess, prefilledArticleId, initialSearch }: Props) {
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<{ id: string; nom: string }[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Article | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [supplierId, setSupplierId] = useState(NONE);
  const [notes, setNotes] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingArticle, setEditingArticle] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(false);
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const qtyRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const pick = (a: Article) => {
    setSelected(a);
    setPrice(a.prix_achat ? String(a.prix_achat) : "");
    setSupplierId(a.fournisseur_id || NONE);
    setDraftPrompt(a.is_draft);
    setEditingArticle(false);
    setReference(isDraftReference(a.reference) ? "" : a.reference);
    setDesignation(a.designation);
    setCategory(a.categorie === "À classer" ? "" : a.categorie);
    setSubcategory(a.sous_categorie || "");
    setBrand(a.marque || "");
    setTimeout(() => qtyRef.current?.select(), 50);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false); setEditingArticle(false); setDraftPrompt(false); setScannedCode(null);
    setArticles([]); setFournisseurs([]); setScannerOpen(false);
    setSearch(prefilledArticleId ? "" : (initialSearch || "")); setScannedCode(!prefilledArticleId && initialSearch ? initialSearch : null);
    setSelected(null); setQuantity(1); setPrice(""); setSupplierId(NONE); setNotes("");
    setFilterCategory(""); setFilterSubcategory(""); setFilterBrand(""); setBrand("");
    (async () => {
      try {
        const [a, f, c] = await Promise.all([
        loadEntryArticles(),
        supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
        supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom"),
      ]);
      if (cancelled) return;
      if (c.error) throw c.error;
      setCategories(c.data || []);
      if (f.error) toast({ title: "Erreur", description: f.error.message, variant: "destructive" });
      const list = a;
      setArticles(list);
      setFournisseurs(f.data || []);
      if (prefilledArticleId) {
        const p = list.find((x) => x.id === prefilledArticleId);
        if (p) {
          pick(p);
          if (!(f.data || []).some((supplier) => supplier.id === p.fournisseur_id)) setSupplierId(NONE);
        }
        else toast({ title: "Erreur", description: "Article introuvable ou inaccessible", variant: "destructive" });
      }
      } catch (error: unknown) {
        if (!cancelled) setLoadFailed(true);
        if (!cancelled) toast({ title: "Erreur", description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible de charger les articles", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, prefilledArticleId, initialSearch, toast]);

  const options = useMemo(() => entryFilterOptions(articles, filterCategory, filterSubcategory), [articles, filterCategory, filterSubcategory]);
  const results = useMemo(() => filterEntryArticles(articles, { category: filterCategory, subcategory: filterSubcategory, brand: filterBrand }, search, scannedCode), [search, articles, scannedCode, filterCategory, filterSubcategory, filterBrand]);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const a = articles.find((x) => x.code_barre === code || x.reference === code);
    if (a) pick(a);
    else { setSelected(null); setSearch(code); setScannedCode(code); }
  };

  const beginCreate = () => {
    setReference(search.trim()); setDesignation(""); setCategory(filterCategory); setSubcategory(filterSubcategory); setBrand(filterBrand);
    setEditingArticle(true); setPrice("");
  };

  const submit = async () => {
    if ((!selected && !editingArticle) || draftPrompt || loading || savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    try {
      const header = {
          entry_type: supplierId !== NONE ? "achat" : "autre",
          entry_date: new Date().toISOString(),
          supplier_id: supplierId !== NONE ? supplierId : null,
          notes: notes.trim() || null,
        };
      if (editingArticle) {
        const article = quickEntryArticle({ id: selected?.id, reference, designation, categorie: category,
          sous_categorie: subcategory, code_barre: selected?.code_barre || scannedCode, price });
        const { data, error } = await supabase.rpc("create_simple_entry_article", {
          p_article: article, p_header: header, p_quantity: quantity,
        });
        if (error) throw error;
        if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.id !== "string") throw new Error("L’entrée n’a pas été confirmée");
      } else if (selected) {
        await createStockEntry(header,
        [{ article_id: selected.id, quantity, unit_price: parseSimpleEntryPrice(price) }],
      );
      }
      toast({ title: editingArticle ? (selected ? "Fiche complétée et entrée enregistrée" : "Article créé et entrée enregistrée") : `✅ Entrée enregistrée : +${quantity} ${selected?.designation}`, className: "bg-success text-success-foreground border-success", duration: 4000 });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast({ title: "Erreur", description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible d’enregistrer l’entrée", variant: "destructive" });
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !scannerOpen} onOpenChange={(nextOpen) => { if (!savingRef.current) onOpenChange(nextOpen); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-success" /> Nouvelle entrée
            </DialogTitle>
          </DialogHeader>

          {!selected && !editingArticle ? (
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
                    onKeyDown={(e) => { if (e.key === "Enter" && results.length === 1) pick(results[0]); }}
                    placeholder="Référence, nom, catégorie ou code-barres"
                    className="pl-9 h-12"
                  />
                </div>
                <Button type="button" variant="outline" disabled={loading} className="h-12 w-12 p-0" onClick={() => setScannerOpen(true)} aria-label="Scanner">
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {loading && <p role="status" className="text-sm text-muted-foreground text-center py-4">Chargement des articles…</p>}
                {results.map((a) => (
                  <Button key={a.id} type="button" variant="outline" onClick={() => { pick(a); if (!fournisseurs.some((f) => f.id === a.fournisseur_id)) setSupplierId(NONE); }}
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
                  <div className="space-y-3 py-4">
                    <p className="text-sm text-muted-foreground">Aucun article trouvé.{search.trim() ? " Cet article n'existe pas encore. Voulez-vous le créer ?" : ""}</p>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" onClick={beginCreate} className="h-auto min-h-11 whitespace-normal justify-start"><Plus className="h-4 w-4 shrink-0 mr-2" />Créer un nouvel article avec cette référence</Button>
                      <Button variant="ghost" onClick={() => { setSearch(""); setScannedCode(null); setFilterCategory(""); setFilterSubcategory(""); setFilterBrand(""); }}>Annuler</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : draftPrompt ? (
            <div className="space-y-3">
              <p className="text-sm">Cet article est en attente de complétion. Voulez-vous compléter sa fiche ?</p>
              <div className="flex gap-2">
                <Button onClick={() => { setDraftPrompt(false); setEditingArticle(true); }}>Compléter la fiche</Button>
                <Button variant="outline" onClick={() => { setDraftPrompt(false); setSelected(null); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <fieldset disabled={submitting} className="space-y-4 min-w-0">
              {editingArticle ? (
                <div className="space-y-3">
                  <div className="space-y-1"><Label htmlFor="quick-entry-reference">Référence *</Label><Input id="quick-entry-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="quick-entry-name">Nom de l'article *</Label><Input id="quick-entry-name" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Catégorie *</Label>
                      <Select value={category} onValueChange={(value) => { setCategory(value); setSubcategory(""); }}><SelectTrigger aria-label="Catégorie"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>{categories.filter((c) => !c.parent_id).map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Sous-catégorie</Label>
                      <Select value={subcategory || NONE} onValueChange={(value) => setSubcategory(value === NONE ? "" : value)}><SelectTrigger aria-label="Sous-catégorie"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{categories.filter((c) => c.parent_id === categories.find((root) => !root.parent_id && root.nom === category)?.id).map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1"><Label htmlFor="quick-entry-brand">Marque</Label><AutocompleteInput id="quick-entry-brand" value={brand} onValueChange={setBrand} suggestions={entryFilterOptions(articles, category, subcategory).brands} placeholder="Marque de l’article" /></div>
                </div>
              ) : selected && (
              <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 p-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{selected.designation}</div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.reference} · stock {selected.stock}</div>
                </div>
                {!prefilledArticleId && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)} aria-label="Changer d'article">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="simple-entry-quantity">{editingArticle && !selected ? "Quantité initiale" : "Quantité entrante"}</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input id="simple-entry-quantity" ref={qtyRef} type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    className="h-12 text-center text-xl font-bold" />
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => setQuantity((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Stock après entrée : {(selected?.stock || 0) + quantity}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="simple-entry-price" className="text-xs">Prix unitaire (optionnel)</Label>
                  <Input id="simple-entry-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fournisseur (optionnel)</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucun</SelectItem>
                      {fournisseurs.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Note (optionnel)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <Button onClick={submit} disabled={submitting}
                className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground">
                {submitting ? "Enregistrement..." : `Valider l'entrée (+${quantity})`}
              </Button>
              {editingArticle && <Button variant="outline" className="w-full" onClick={() => { setEditingArticle(false); setSelected(null); }}>Annuler</Button>}
            </fieldset>
          )}
        </DialogContent>
      </Dialog>
      <BarcodeScanner isOpen={scannerOpen} onScanResult={handleScan} onClose={() => setScannerOpen(false)} />
    </>
  );
}
