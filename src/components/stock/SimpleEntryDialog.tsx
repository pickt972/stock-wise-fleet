import { useEffect, useRef, useState } from "react";
import { Minus, PackagePlus, Plus, X } from "lucide-react";
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
import { QuickArticleFields } from "./shared/QuickArticleFields";
import { StockArticleSearch } from "./shared/StockArticleSearch";

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

  const createAndSelect = async () => {
    if (savingRef.current || loading) return;
    savingRef.current = true;
    setSubmitting(true);
    try {
      const article = quickEntryArticle({ reference, designation, categorie: category, sous_categorie: subcategory, marque: brand, code_barre: scannedCode, price });
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Veuillez vous connecter pour créer un article");
      const { data, error } = await supabase.from("articles").insert({
        ...article, user_id: authData.user.id, fournisseur_id: supplierId === NONE ? null : supplierId,
      }).select("id, reference, designation, categorie, sous_categorie, marque, code_barre, stock, stock_min, prix_achat, fournisseur_id, is_draft").single();
      if (error) throw error;
      if (!data) throw new Error("La création de l’article n’a pas été confirmée");
      setArticles((current) => [...current, data]);
      pick(data);
      toast({ title: "Article créé", className: "bg-success text-success-foreground border-success", duration: 4000 });
    } catch (error: unknown) {
      toast({ title: "Erreur", description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible de créer l’article", variant: "destructive" });
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if ((!selected && !editingArticle) || draftPrompt || loading || savingRef.current) return;
    if (editingArticle && !selected) { await createAndSelect(); return; }
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
            <StockArticleSearch {...{ articles, loading, loadFailed, search, setSearch, filterCategory, setFilterCategory, filterSubcategory, setFilterSubcategory, filterBrand, setFilterBrand, scannedCode, setScannedCode }}
              onPick={(a) => { pick(a); if (!fournisseurs.some((f) => f.id === a.fournisseur_id)) setSupplierId(NONE); }} onCreate={beginCreate} onScan={() => setScannerOpen(true)} />
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
                <QuickArticleFields {...{ reference, setReference, designation, setDesignation, category, setCategory, subcategory, setSubcategory, brand, setBrand, articles, categories }} showBrand={!selected} />
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
                {submitting ? "Enregistrement..." : editingArticle && !selected ? "Créer l’article et continuer" : `Valider l'entrée (+${quantity})`}
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
