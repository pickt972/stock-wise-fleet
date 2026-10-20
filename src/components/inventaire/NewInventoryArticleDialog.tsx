import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { StockQuantitySelector } from "@/components/stock/shared/StockQuantitySelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseOptionalNumber } from "./newInventoryArticle";

const NONE = "__none__";

export function NewInventoryArticleDialog({ code, inventoryId, onClose, onCounted }: {
  code: string | null; inventoryId: string; onClose: () => void; onCounted: () => void;
}) {
  const { toast } = useToast();
  const [reference, setReference] = useState("");
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [min, setMin] = useState("");
  const [emp, setEmp] = useState(NONE);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (code === null) return;
    setReference(code); setName(""); setCat(""); setSub(""); setBrand(""); setPrice(""); setMin(""); setEmp(NONE); setQty(1);
  }, [code]);

  const { data } = useQuery({
    queryKey: ["inventory-new-article-options"], enabled: code !== null,
    queryFn: async () => {
      const [c, e] = await Promise.all([
        supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom"),
        supabase.from("emplacements").select("id, nom").eq("actif", true).order("nom"),
      ]);
      if (c.error) throw c.error;
      return { cats: c.data ?? [], emps: e.data ?? [] };
    },
  });
  const cats = data?.cats ?? [];
  const rootId = cats.find((c) => !c.parent_id && c.nom === cat)?.id;
  const subs = cats.filter((c) => c.parent_id && c.parent_id === rootId);
  const valid = reference.trim() && name.trim() && cat && sub && qty >= 0;

  const submit = async () => {
    if (!valid || busy) return;
    const p = parseOptionalNumber(price), m = parseOptionalNumber(min);
    if (Number.isNaN(p) || Number.isNaN(m)) { toast({ title: "Valeur invalide", description: "Prix et seuil doivent être des nombres positifs.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Veuillez vous connecter pour créer un article");
      const code_barre = code?.trim() || null;
      const empRow = data?.emps.find((x) => x.id === emp);
      const { data: art, error } = await supabase.from("articles").insert({
        reference: reference.trim(), designation: name.trim(), categorie: cat, sous_categorie: sub,
        marque: brand.trim(), prix_achat: p ?? 0, stock_min: m ?? 0, stock: 0, is_draft: false,
        code_barre, emplacement_id: empRow?.id ?? null, emplacement: empRow?.nom ?? null, user_id: auth.user.id,
      } as any).select("id").single();
      if (error) throw error;
      const { error: e2 } = await supabase.rpc("add_inventory_article" as any, { p_inventaire_id: inventoryId, p_article_id: art.id, p_qty: qty });
      if (e2) throw e2;
      toast({ title: "Article créé et compté", description: `${reference.trim()} : ${qty}` });
      onCounted();
    } catch (err: unknown) {
      toast({ title: "Erreur", description: err && typeof err === "object" && "message" in err ? String((err as any).message) : "Création impossible", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={code !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel article détecté</DialogTitle>
          <DialogDescription>Ce code ne correspond à aucun article. Créez-le pour l'ajouter au comptage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="inv-new-ref">Code-barres / Référence *</Label><Input id="inv-new-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="inv-new-name">Nom *</Label><Input id="inv-new-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Catégorie *</Label>
              <Select value={cat} onValueChange={(v) => { setCat(v); setSub(""); }}>
                <SelectTrigger aria-label="Catégorie"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{cats.filter((c) => !c.parent_id).map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Sous-catégorie *</Label>
              <Select value={sub} onValueChange={setSub} disabled={!cat}>
                <SelectTrigger aria-label="Sous-catégorie"><SelectValue placeholder={subs.length || !cat ? "Choisir" : "Aucune disponible"} /></SelectTrigger>
                <SelectContent>{subs.map((c) => <SelectItem key={c.id} value={c.nom}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="inv-new-brand">Marque</Label><Input id="inv-new-brand" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="inv-new-price">Prix unitaire (€)</Label><Input id="inv-new-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="inv-new-min">Seuil d'alerte</Label><Input id="inv-new-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} /></div>
            <div className="space-y-1"><Label>Emplacement</Label>
              <Select value={emp} onValueChange={setEmp}>
                <SelectTrigger aria-label="Emplacement"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Aucun</SelectItem>{(data?.emps ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label htmlFor="inv-new-qty">Quantité comptée</Label>
            <StockQuantitySelector id="inv-new-qty" value={qty} onChange={setQty} disabled={busy} onEnter={submit} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Ignorer</Button>
          <Button onClick={submit} disabled={!valid || busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Créer et compter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
