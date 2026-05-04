import { useEffect, useMemo, useState } from "react";
import { Merge, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MergeArticleLite {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  sous_categorie?: string | null;
  stock: number;
  emplacement?: string | null;
  emplacement_id?: string | null;
  prix_achat?: number | null;
  code_barre?: string | null;
  fournisseur_id?: string | null;
}

interface CategoryNode {
  id: string;
  nom: string;
  parent_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: MergeArticleLite[];
  allCategories?: CategoryNode[];
  onDone?: () => void;
}

export function MergeSelectedArticlesDialog({ open, onOpenChange, articles, allCategories = [], onDone }: Props) {
  const [busy, setBusy] = useState(false);
  // Par défaut : article avec le plus de stock
  const defaultWinner = useMemo(() => {
    if (articles.length === 0) return "";
    return [...articles].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))[0].id;
  }, [articles]);
  const [winnerId, setWinnerId] = useState<string>(defaultWinner);

  // Catégorie / sous-catégorie cible
  const parentCats = useMemo(() => allCategories.filter((c) => !c.parent_id), [allCategories]);
  const childCats = useMemo(() => allCategories.filter((c) => c.parent_id), [allCategories]);

  // Map nom-de-catégorie -> nom-du-parent (utilisé pour deviner le parent par défaut)
  const childNameToParentName = useMemo(() => {
    const m = new Map<string, string>();
    for (const child of childCats) {
      const parent = parentCats.find((p) => p.id === child.parent_id);
      if (parent) m.set(child.nom, parent.nom);
    }
    return m;
  }, [parentCats, childCats]);

  const winnerArticle = articles.find((a) => a.id === winnerId);
  const defaultParent = useMemo(() => {
    if (!winnerArticle) return "";
    // Si la catégorie de l'article est elle-même une sous-cat, on remonte au parent
    return childNameToParentName.get(winnerArticle.categorie) ?? winnerArticle.categorie;
  }, [winnerArticle, childNameToParentName]);
  const defaultSub = useMemo(() => {
    if (!winnerArticle) return "__none__";
    if (childNameToParentName.has(winnerArticle.categorie)) return winnerArticle.categorie;
    return winnerArticle.sous_categorie || "__none__";
  }, [winnerArticle, childNameToParentName]);

  const [targetParent, setTargetParent] = useState<string>(defaultParent);
  const [targetSub, setTargetSub] = useState<string>(defaultSub);

  // Reset à l'ouverture / changement de gagnant
  useEffect(() => {
    if (open) {
      setWinnerId(defaultWinner);
    }
  }, [open, defaultWinner]);

  useEffect(() => {
    setTargetParent(defaultParent);
    setTargetSub(defaultSub);
  }, [defaultParent, defaultSub]);

  // Sous-catégories disponibles pour le parent choisi
  const availableSubs = useMemo(() => {
    const parent = parentCats.find((p) => p.nom === targetParent);
    if (!parent) return [];
    return childCats.filter((c) => c.parent_id === parent.id);
  }, [targetParent, parentCats, childCats]);

  const winner = articles.find((a) => a.id === winnerId);
  const losers = articles.filter((a) => a.id !== winnerId);
  const totalStock = articles.reduce((s, a) => s + (a.stock ?? 0), 0);

  const runMerge = async () => {
    if (!winner || losers.length === 0) return;
    setBusy(true);
    try {
      const loserIds = losers.map((l) => l.id);

      await supabase.from("stock_movements").update({ article_id: winner.id }).in("article_id", loserIds);
      await supabase.from("stock_entry_items").update({ article_id: winner.id }).in("article_id", loserIds);
      await supabase.from("stock_exit_items").update({ article_id: winner.id }).in("article_id", loserIds);
      await supabase.from("commande_items").update({ article_id: winner.id }).in("article_id", loserIds);
      await supabase.from("inventaire_items").update({ article_id: winner.id }).in("article_id", loserIds);

      // article_fournisseurs : déduplication
      const { data: afLinks } = await supabase
        .from("article_fournisseurs")
        .select("id, fournisseur_id")
        .in("article_id", loserIds);
      const { data: afExisting } = await supabase
        .from("article_fournisseurs")
        .select("fournisseur_id")
        .eq("article_id", winner.id);
      const afSet = new Set((afExisting ?? []).map((r) => r.fournisseur_id));
      const afUpdate: string[] = [];
      const afDelete: string[] = [];
      for (const link of afLinks ?? []) {
        if (afSet.has(link.fournisseur_id)) afDelete.push(link.id);
        else {
          afUpdate.push(link.id);
          afSet.add(link.fournisseur_id);
        }
      }
      if (afUpdate.length)
        await supabase.from("article_fournisseurs").update({ article_id: winner.id }).in("id", afUpdate);
      if (afDelete.length) await supabase.from("article_fournisseurs").delete().in("id", afDelete);

      // article_vehicules : déduplication
      const { data: avLinks } = await supabase
        .from("article_vehicules")
        .select("id, vehicule_id")
        .in("article_id", loserIds);
      const { data: avExisting } = await supabase
        .from("article_vehicules")
        .select("vehicule_id")
        .eq("article_id", winner.id);
      const avSet = new Set((avExisting ?? []).map((r) => r.vehicule_id));
      const avUpdate: string[] = [];
      const avDelete: string[] = [];
      for (const link of avLinks ?? []) {
        if (avSet.has(link.vehicule_id)) avDelete.push(link.id);
        else {
          avUpdate.push(link.id);
          avSet.add(link.vehicule_id);
        }
      }
      if (avUpdate.length)
        await supabase.from("article_vehicules").update({ article_id: winner.id }).in("id", avUpdate);
      if (avDelete.length) await supabase.from("article_vehicules").delete().in("id", avDelete);

      // Cumuler le stock + compléter les champs manquants du gagnant
      const totalLostStock = losers.reduce((s, l) => s + (l.stock ?? 0), 0);
      const updates: Record<string, any> = {
        stock: (winner.stock ?? 0) + totalLostStock,
      };
      if (!winner.code_barre) {
        const cb = losers.find((l) => l.code_barre)?.code_barre;
        if (cb) updates.code_barre = cb;
      }
      if (!winner.emplacement_id) {
        const em = losers.find((l) => l.emplacement_id)?.emplacement_id;
        if (em) updates.emplacement_id = em;
      }
      if (!winner.emplacement) {
        const em = losers.find((l) => l.emplacement)?.emplacement;
        if (em) updates.emplacement = em;
      }
      if (!winner.fournisseur_id) {
        const fid = losers.find((l) => l.fournisseur_id)?.fournisseur_id;
        if (fid) updates.fournisseur_id = fid;
      }
      if (!winner.prix_achat || Number(winner.prix_achat) === 0) {
        const p = losers.find((l) => l.prix_achat && Number(l.prix_achat) > 0)?.prix_achat;
        if (p) updates.prix_achat = p;
      }

      // Catégorie / sous-catégorie cible (s'applique à l'article conservé)
      if (targetParent) {
        if (targetSub && targetSub !== "__none__") {
          // Si une sous-catégorie est choisie, c'est elle qui devient la "categorie"
          updates.categorie = targetSub;
          updates.sous_categorie = targetSub;
        } else {
          updates.categorie = targetParent;
          updates.sous_categorie = null;
        }
      }

      const { error: upErr } = await supabase.from("articles").update(updates).eq("id", winner.id);
      if (upErr) throw upErr;

      const { error: delErr } = await supabase.from("articles").delete().in("id", loserIds);
      if (delErr) throw delErr;

      toast.success(`Fusion terminée : ${losers.length} article(s) fusionné(s) dans "${winner.designation}"`);
      onDone?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Échec de la fusion : " + (e.message ?? "erreur inconnue"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Fusionner {articles.length} articles
          </DialogTitle>
          <DialogDescription>
            Choisissez l'article à conserver. Les autres seront supprimés et leurs stocks, mouvements et liens transférés vers l'article conservé.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span>
            Stock cumulé après fusion : <strong>{totalStock}</strong> · {losers.length} article(s) supprimé(s)
          </span>
        </div>

        {parentCats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Catégorie cible</Label>
              <SearchableSelect
                options={parentCats.map((c) => ({ value: c.nom, label: c.nom }))}
                value={targetParent}
                onValueChange={(v) => {
                  setTargetParent(v);
                  setTargetSub("__none__");
                }}
                placeholder="Choisir une catégorie"
                searchPlaceholder="Rechercher..."
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Sous-catégorie (optionnel)</Label>
              <SearchableSelect
                options={[
                  { value: "__none__", label: "— Aucune —" },
                  ...availableSubs.map((c) => ({ value: c.nom, label: c.nom })),
                ]}
                value={targetSub}
                onValueChange={setTargetSub}
                placeholder="Aucune"
                searchPlaceholder="Rechercher..."
                triggerClassName="w-full"
              />
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[380px] pr-2">
          <RadioGroup value={winnerId} onValueChange={setWinnerId} className="space-y-2">
            {articles.map((a) => {
              const isWinner = a.id === winnerId;
              return (
                <Label
                  key={a.id}
                  htmlFor={`winner-${a.id}`}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    isWinner ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                  }`}
                >
                  <RadioGroupItem value={a.id} id={`winner-${a.id}`} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.designation}</span>
                      {isWinner ? (
                        <Badge variant="default">Conservé</Badge>
                      ) : (
                        <Badge variant="secondary">Fusionné</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      <span className="font-mono">{a.reference}</span>
                      {a.marque && <span> · {a.marque}</span>}
                      <span> · stock {a.stock}</span>
                      {a.emplacement && <span> · {a.emplacement}</span>}
                    </div>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={runMerge} disabled={busy || !winner || losers.length === 0}>
            {busy ? "Fusion…" : `Confirmer la fusion (${losers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
