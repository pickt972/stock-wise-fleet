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

interface Article {
  id: string;
  reference: string;
  designation: string;
  categorie: string;
  sous_categorie: string | null;
  code_barre: string | null;
  stock: number;
  prix_achat: number;
  fournisseur_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledArticleId?: string;
}

const NONE = "__none__";

export function SimpleEntryDialog({ open, onOpenChange, onSuccess, prefilledArticleId }: Props) {
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
  const qtyRef = useRef<HTMLInputElement>(null);

  const pick = (a: Article) => {
    setSelected(a);
    setPrice(a.prix_achat ? String(a.prix_achat) : "");
    setSupplierId(a.fournisseur_id || NONE);
    setTimeout(() => qtyRef.current?.select(), 50);
  };

  useEffect(() => {
    if (!open) return;
    setSearch(""); setSelected(null); setQuantity(1); setPrice(""); setSupplierId(NONE); setNotes("");
    (async () => {
      const [a, f] = await Promise.all([
        supabase.from("articles")
          .select("id, reference, designation, categorie, sous_categorie, code_barre, stock, prix_achat, fournisseur_id")
          .is("archived_at", null).order("designation"),
        supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
      ]);
      if (a.error) toast({ title: "Erreur", description: a.error.message, variant: "destructive" });
      const list = (a.data || []) as Article[];
      setArticles(list);
      setFournisseurs(f.data || []);
      if (prefilledArticleId) {
        const p = list.find((x) => x.id === prefilledArticleId);
        if (p) pick(p);
      }
    })();
  }, [open, prefilledArticleId]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return articles.filter((a) =>
      [a.reference, a.designation, a.categorie, a.sous_categorie, a.code_barre]
        .some((v) => v?.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [search, articles]);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const a = articles.find((x) => x.code_barre === code || x.reference === code);
    if (a) pick(a);
    else { setSearch(code); toast({ title: "Article introuvable", description: code, variant: "destructive" }); }
  };

  const submit = async () => {
    if (!selected || quantity < 1) return;
    setSubmitting(true);
    try {
      await createStockEntry(
        {
          entry_type: supplierId !== NONE ? "achat" : "autre",
          entry_date: new Date().toISOString(),
          supplier_id: supplierId !== NONE ? supplierId : null,
          notes: notes.trim() || null,
        },
        [{ article_id: selected.id, quantity, unit_price: parseFloat(price.replace(",", ".")) || 0 }],
      );
      toast({ title: `✅ Entrée enregistrée : +${quantity} ${selected.designation}` });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !scannerOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-success" /> Nouvelle entrée
            </DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && results.length === 1) pick(results[0]); }}
                    placeholder="Référence, nom, catégorie ou code-barres"
                    className="pl-9 h-12"
                  />
                </div>
                <Button type="button" variant="outline" className="h-12 w-12 p-0" onClick={() => setScannerOpen(true)} aria-label="Scanner">
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-1">
                {results.map((a) => (
                  <button key={a.id} type="button" onClick={() => pick(a)}
                    className="w-full text-left rounded-md border p-3 hover:bg-muted transition-colors">
                    <div className="font-medium text-sm truncate">{a.designation}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {a.reference} · {a.categorie} · stock {a.stock}
                    </div>
                  </button>
                ))}
                {search.trim() && results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun article trouvé</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label>Quantité entrante</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input ref={qtyRef} type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    className="h-12 text-center text-xl font-bold" />
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => setQuantity((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Stock après entrée : {selected.stock + quantity}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Prix unitaire (optionnel)</Label>
                  <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
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
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BarcodeScanner isOpen={scannerOpen} onScanResult={handleScan} onClose={() => setScannerOpen(false)} />
    </>
  );
}
