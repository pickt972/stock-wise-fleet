import { useEffect, useMemo, useState } from "react";
import { Merge, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Article = Tables<"articles">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toString().trim().toUpperCase().replace(/[\s\-_./]/g, "");

/** Score : on garde l'article le plus "riche" (stock, prix, données récentes). */
function scoreArticle(a: Article): number {
  let s = 0;
  s += (a.stock ?? 0) * 0.1;
  if (a.prix_achat && Number(a.prix_achat) > 0) s += 2;
  if (a.code_barre) s += 2;
  if (a.emplacement_id) s += 1;
  if (a.fournisseur_id) s += 1;
  if (a.designation && a.designation.length > 5) s += 1;
  s += new Date(a.updated_at).getTime() / 1e12;
  return s;
}

export function MergeDuplicateArticlesDialog({ open, onOpenChange, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("articles")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error("Erreur de chargement: " + error.message);
        setArticles((data ?? []) as Article[]);
        setLoading(false);
      });
  }, [open]);

  // Groupes par référence normalisée
  const groups = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const a of articles) {
      const key = norm(a.reference);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({
        key,
        list: [...list].sort((a, b) => scoreArticle(b) - scoreArticle(a)),
      }));
  }, [articles]);

  const totalDuplicates = groups.reduce((s, g) => s + (g.list.length - 1), 0);

  const runMerge = async () => {
    if (groups.length === 0) return;
    setBusy(true);
    try {
      let mergedCount = 0;

      for (const g of groups) {
        const [winner, ...losers] = g.list;
        const loserIds = losers.map((l) => l.id);
        const totalLostStock = losers.reduce((s, l) => s + (l.stock ?? 0), 0);

        // 1) Réassigner les tables enfants simples (article_id)
        await supabase.from("stock_movements").update({ article_id: winner.id }).in("article_id", loserIds);
        await supabase.from("stock_entry_items").update({ article_id: winner.id }).in("article_id", loserIds);
        await supabase.from("stock_exit_items").update({ article_id: winner.id }).in("article_id", loserIds);
        await supabase.from("commande_items").update({ article_id: winner.id }).in("article_id", loserIds);
        await supabase.from("inventaire_items").update({ article_id: winner.id }).in("article_id", loserIds);

        // 2) article_fournisseurs : éviter doublon (article_id, fournisseur_id)
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

        // 3) article_vehicules : éviter doublon (article_id, vehicule_id)
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

        // 4) Mettre à jour le gagnant : compléter champs manquants + cumuler stock
        const updates: Partial<Article> = {
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

        const { error: upErr } = await supabase.from("articles").update(updates).eq("id", winner.id);
        if (upErr) throw upErr;

        // 5) Supprimer les perdants
        const { error: delErr } = await supabase.from("articles").delete().in("id", loserIds);
        if (delErr) throw delErr;

        mergedCount += losers.length;
      }

      toast.success(`Fusion terminée : ${mergedCount} doublon(s) d'articles supprimé(s)`);
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
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Fusionner les doublons (articles)
          </DialogTitle>
          <DialogDescription>
            Détection automatique par référence. L'article le plus complet est conservé, les stocks sont cumulés et
            tous les mouvements, commandes, inventaires et compatibilités sont rattachés au gagnant.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Analyse en cours…</div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            Aucun doublon d'article détecté.
          </div>
        ) : (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>
                <strong>{groups.length}</strong> groupe(s) de doublons — <strong>{totalDuplicates}</strong> article(s)
                seront fusionnés puis supprimés.
              </span>
            </div>
            <ScrollArea className="max-h-[340px] pr-2">
              <div className="space-y-3">
                {groups.map((g) => {
                  const sumStock = g.list.reduce((s, a) => s + (a.stock ?? 0), 0);
                  return (
                    <div key={g.key} className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        Réf : <span className="font-mono">{g.list[0].reference}</span> · stock cumulé final :{" "}
                        <strong>{sumStock}</strong>
                      </div>
                      <div className="space-y-1.5">
                        {g.list.map((a, idx) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                            <div className="truncate">
                              <span className="font-medium">{a.designation}</span>
                              <span className="text-muted-foreground"> · {a.marque}</span>
                              <span className="text-muted-foreground"> · stock {a.stock}</span>
                            </div>
                            {idx === 0 ? (
                              <Badge variant="default">Conservé</Badge>
                            ) : (
                              <Badge variant="secondary">Fusionné</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={runMerge} disabled={busy || loading || groups.length === 0}>
            {busy ? "Fusion…" : `Fusionner ${totalDuplicates} doublon(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
