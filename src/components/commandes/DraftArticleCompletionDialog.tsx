import { useEffect, useState } from "react";
import { ScanLine, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CategoryCardGrid } from "@/components/shared/CategoryPicker";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";

export interface DraftCompletion {
  designation: string;
  reference: string;
  code_barre: string;
  marque: string;
  categorie: string;
  sous_categorie: string;
  prix_achat: number;
  emplacement_id: string;
}

export function DraftArticleCompletionDialog({
  open,
  designation,
  estimatedPrice,
  position,
  onSubmit,
  onSkip,
}: {
  open: boolean;
  designation: string;
  estimatedPrice: number;
  position: string;
  onSubmit: (c: DraftCompletion) => void;
  onSkip: () => void;
}) {
  const empty: DraftCompletion = {
    designation, reference: "", code_barre: "", marque: "", categorie: "", sous_categorie: "",
    prix_achat: estimatedPrice, emplacement_id: "",
  };
  const [f, setF] = useState<DraftCompletion>(empty);
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [emps, setEmps] = useState<{ id: string; nom: string }[]>([]);
  const [scan, setScan] = useState(false);

  useEffect(() => { if (open) setF(empty); /* eslint-disable-next-line */ }, [open, designation]);
  useEffect(() => {
    supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order").order("nom")
      .then(({ data }) => setCats((data as any) || []));
    supabase.from("emplacements").select("id, nom").eq("actif", true).order("nom")
      .then(({ data }) => setEmps((data as any) || []));
  }, []);

  const roots = cats.filter((c) => !c.parent_id);
  const rootId = roots.find((r) => r.nom === f.categorie)?.id;
  const subs = cats.filter((c) => c.parent_id === rootId);
  const set = (k: keyof DraftCompletion, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compléter la fiche article <span className="text-sm text-muted-foreground">({position})</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Désignation *</Label>
              <Input value={f.designation} onChange={(e) => set("designation", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Catégorie / sous-catégorie *</Label>
              {!f.categorie ? (
                <div className="max-h-56 overflow-y-auto mt-1">
                  <CategoryCardGrid items={roots.map((r) => r.nom)} onSelect={(c) => setF((p) => ({ ...p, categorie: c, sous_categorie: "" }))} />
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setF((p) => ({ ...p, categorie: "", sous_categorie: "" }))}>
                    <ChevronLeft className="h-4 w-4 mr-1" />{f.categorie}{f.sous_categorie ? ` › ${f.sous_categorie}` : ""}
                  </Button>
                  {subs.length > 0 && !f.sous_categorie && (
                    <div className="max-h-48 overflow-y-auto">
                      <CategoryCardGrid items={subs.map((s) => s.nom)} showIcons={false} onSelect={(s) => set("sous_categorie", s)} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Référence fournisseur</Label>
                <Input value={f.reference} onChange={(e) => set("reference", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Marque</Label>
                <Input value={f.marque} onChange={(e) => set("marque", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label className="text-xs">Code-barres</Label>
                <div className="flex gap-1">
                  <Input value={f.code_barre} onChange={(e) => set("code_barre", e.target.value)} />
                  <Button type="button" size="icon" variant="outline" onClick={() => setScan(true)} aria-label="Scanner">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Prix unitaire réel (€)</Label>
                <Input type="number" min="0" step="0.01" value={f.prix_achat}
                  onChange={(e) => set("prix_achat", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Emplacement</Label>
              <Select value={f.emplacement_id} onValueChange={(v) => set("emplacement_id", v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un emplacement" /></SelectTrigger>
                <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onSkip}>Passer (fiche incomplète)</Button>
            <Button disabled={!f.designation.trim() || !f.categorie} onClick={() => onSubmit(f)}>Valider la fiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodeScanner isOpen={scan} onClose={() => setScan(false)} onScanResult={(c: string) => { set("code_barre", c); setScan(false); }} />
    </>
  );
}
