import { useEffect, useMemo, useState } from "react";
import { ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { receiveOrderLine, type OrderLine } from "@/lib/receiveDraftLine";

interface Art { id: string; designation: string; reference: string; marque: string | null; categorie: string | null; sous_categorie: string | null; code_barre: string | null; prix_achat: number; is_draft: boolean }

export function ReceiveLineDialog({ line, initialBarcode, onClose, onDone }: {
  line: OrderLine; initialBarcode?: string | null; onClose: () => void; onDone: () => void;
}) {
  const { toast } = useToast();
  const remaining = line.quantite_commandee - line.quantite_recue;
  const [qty, setQty] = useState(String(remaining));
  const [barcode, setBarcode] = useState(initialBarcode || line.code_barre || "");
  const [scan, setScan] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(line.article_id ? "existing" : "new");
  const [articles, setArticles] = useState<Art[]>([]);
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [articleId, setArticleId] = useState<string | null>(line.article_id);
  const [search, setSearch] = useState("");
  const [prix, setPrix] = useState(line.prix_unitaire ? String(line.prix_unitaire) : "");
  const [n, setN] = useState({
    designation: [line.sous_categorie || line.categorie, line.precision_note].filter(Boolean).join(" — ") || line.designation,
    reference: "", marque: "", categorie: line.categorie || "", sous_categorie: line.sous_categorie || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("articles").select("id, designation, reference, marque, categorie, sous_categorie, code_barre, prix_achat, is_draft").is("archived_at", null)
      .then(({ data, error }) => { if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" }); else setArticles((data as any) || []); });
    supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom")
      .then(({ data, error }) => { if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" }); else setCats((data as any) || []); });
  }, []);

  // Barcode → existing article
  useEffect(() => {
    const c = barcode.trim();
    if (!c || articles.length === 0) return;
    const hit = articles.find((a) => (a.code_barre || "").trim() === c);
    if (hit) { setMode("existing"); setArticleId(hit.id); if (!prix) setPrix(String(hit.prix_achat || "")); }
  }, [barcode, articles]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = articles.find((a) => a.id === articleId) || null;
  useEffect(() => {
    if (selected?.is_draft) {
      setN({ designation: selected.designation, reference: /^(DRAFT-|A-COMPLETER-)/.test(selected.reference) ? "" : selected.reference,
        marque: selected.marque || "", categorie: selected.categorie || "", sous_categorie: selected.sous_categorie || "" });
      setBarcode(selected.code_barre || initialBarcode || line.code_barre || "");
    }
  }, [selected?.id]);
  const candidates = useMemo(() => {
    const t = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (!t && line.categorie && a.categorie !== line.categorie) return false;
      if (!t && line.sous_categorie && a.sous_categorie !== line.sous_categorie) return false;
      return !t || `${a.designation} ${a.reference} ${a.marque ?? ""} ${a.code_barre ?? ""}`.toLowerCase().includes(t);
    }).slice(0, 30);
  }, [articles, search, line.categorie, line.sous_categorie]);

  const roots = cats.filter((c) => !c.parent_id);
  const subs = cats.filter((c) => c.parent_id === roots.find((r) => r.nom === n.categorie)?.id);
  const q = parseInt(qty, 10);
  const valid = Number.isInteger(q) && q >= 1 && q <= remaining && (mode === "existing" ? !!articleId : !!n.categorie && !!n.designation.trim());

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const status = await receiveOrderLine(line, {
        qty: q, prix: Math.max(0, parseFloat(prix.replace(",", ".")) || 0),
        articleId: mode === "existing" ? articleId : null,
        newArticle: mode === "new" || selected?.is_draft ? { ...n, code_barre: barcode } : null,
      });
      toast({ className: "bg-success text-success-foreground border-success", title: "Réception enregistrée", description: status === "recu_complet" ? "Commande entièrement reçue" : "Stock mis à jour" });
      onDone();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réceptionner</DialogTitle>
          <DialogDescription>
            {line.designation} • Commande {line.numero_commande}
            {line.vehicule_label ? ` • 🚗 ${line.vehicule_label}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {line.precision_note && <p className="text-sm italic text-muted-foreground">« {line.precision_note} »</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quantité reçue * <span className="text-muted-foreground">(reste {remaining})</span></Label>
              <Input type="number" inputMode="numeric" min="1" max={remaining} value={qty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Prix réel unitaire (€)</Label>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Code-barres</Label>
            <div className="flex gap-2">
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scanner ou saisir" />
              <Button type="button" size="icon" variant="outline" onClick={() => setScan(true)} aria-label="Scanner"><ScanLine className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="inline-flex rounded-lg border p-1 bg-muted/40">
            {([["existing", "Article existant"], ["new", "Nouvelle fiche"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === k ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              {selected && (
                <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">
                  <strong>{selected.designation}</strong> — Réf : {selected.reference}{selected.marque ? ` — ${selected.marque}` : ""}
                </p>
              )}
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un article (désignation, référence…)" />
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {candidates.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Aucun article trouvé — créez une nouvelle fiche.</p>
                ) : candidates.map((a) => (
                  <button key={a.id} type="button" onClick={() => { setArticleId(a.id); if (!prix) setPrix(String(a.prix_achat || "")); }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${a.id === articleId ? "bg-primary/10" : ""}`}>
                    <span className="font-medium">{a.designation}</span>
                    <span className="text-muted-foreground"> — {a.reference}{a.marque ? ` — ${a.marque}` : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {(mode === "new" || selected?.is_draft) && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Désignation *</Label>
                <Input value={n.designation} onChange={(e) => setN({ ...n, designation: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Référence exacte</Label>
                  <Input value={n.reference} onChange={(e) => setN({ ...n, reference: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Marque</Label>
                  <Input value={n.marque} onChange={(e) => setN({ ...n, marque: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Catégorie *</Label>
                  <Select value={n.categorie} onValueChange={(v) => setN({ ...n, categorie: v, sous_categorie: "" })}>
                    <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                    <SelectContent>{roots.map((r) => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sous-catégorie</Label>
                  <Select value={n.sous_categorie} onValueChange={(v) => setN({ ...n, sous_categorie: v })} disabled={subs.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Sous-catégorie" /></SelectTrigger>
                    <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Sans référence, marque ou code-barres, la fiche restera marquée « Fiche incomplète ».</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={!valid || saving}>{saving ? "Enregistrement…" : "Valider la réception"}</Button>
        </DialogFooter>
        <BarcodeScanner isOpen={scan} onClose={() => setScan(false)} onScanResult={(c: string) => { setBarcode(c); setScan(false); }} />
      </DialogContent>
    </Dialog>
  );
}
