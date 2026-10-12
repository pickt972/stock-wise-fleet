import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle2, Loader2, XCircle, Check } from "lucide-react";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { countingProgress, itemsWithVariance, sortForCounting, variance, varianceTone } from "@/lib/inventory";
import { fetchItems, fmtDateTime, type InventoryRow } from "./inventoryData";
import { cn } from "@/lib/utils";

const toneClass = {
  negative: "text-destructive",
  positive: "text-success",
  neutral: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

export function InventoryCounting({ inventory, openerName, onFinished }: {
  inventory: InventoryRow; openerName: string; onFinished: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["inventory-items", inventory.id];
  const { data: items = [], isLoading } = useQuery({ queryKey: key, queryFn: () => fetchItems(inventory.id) });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [search, setSearch] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [applyStock, setApplyStock] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (itemId: string, raw: string) => {
    const qty = raw.trim() === "" ? null : Number(raw);
    if (qty !== null && (!Number.isInteger(qty) || qty < 0)) return;
    setSaving((s) => ({ ...s, [itemId]: true }));
    const { error } = await supabase.rpc("set_inventory_count" as any, { p_item_id: itemId, p_qty: qty });
    setSaving((s) => ({ ...s, [itemId]: false }));
    if (error) {
      toast({ title: "Comptage non enregistré", description: error.message, variant: "destructive" });
      return;
    }
    qc.setQueryData(key, (old: any[] = []) => old.map((i) => i.id === itemId
      ? { ...i, stock_compte: qty, ecart: variance(i.stock_theorique, qty) } : i));
    setDrafts((d) => { const n = { ...d }; delete n[itemId]; return n; });
    qc.invalidateQueries({ queryKey: ["inventories"] });
  };

  const onType = (itemId: string, raw: string) => {
    setDrafts((d) => ({ ...d, [itemId]: raw }));
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(() => save(itemId, raw), 700);
  };

  const onScan = (code: string) => {
    const c = code.trim().toLowerCase();
    const it = items.find((i) => i.articles?.code_barre?.toLowerCase() === c || i.reference?.toLowerCase() === c);
    if (!it) { toast({ title: "Article hors périmètre", description: code, variant: "destructive" }); return; }
    const next = (it.stock_compte ?? 0) + 1;
    save(it.id, String(next));
    toast({ title: `${it.reference} : ${next}` });
    setSearch("");
  };

  const progress = countingProgress(items);
  const variances = itemsWithVariance(items);
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? items.filter((i) =>
      [i.reference, i.articles?.designation, i.articles?.marque, i.articles?.code_barre].some((v) => v?.toLowerCase().includes(q))) : items;
    return sortForCounting(list);
  }, [items, search]);

  const doClose = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("close_inventory_session" as any, { p_inventaire_id: inventory.id, p_apply_to_stock: applyStock });
    setBusy(false);
    if (error) { toast({ title: "Clôture impossible", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Inventaire clôturé", description: applyStock ? "Le stock a été ajusté." : "Le stock n'a pas été modifié." });
    setConfirmApply(false); setCloseOpen(false);
    qc.invalidateQueries();
    onFinished();
  };

  const doAbandon = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("abandon_inventory" as any, { p_inventaire_id: inventory.id, p_reason: reason });
    setBusy(false);
    if (error) { toast({ title: "Abandon impossible", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Inventaire abandonné" });
    setAbandonOpen(false);
    qc.invalidateQueries({ queryKey: ["inventories"] });
    onFinished();
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {inventory.reference} <Badge variant="secondary">🟡 En cours</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {inventory.label ? `${inventory.label} · ` : ""}Ouvert le {fmtDateTime(inventory.opened_at)} par {openerName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAbandonOpen(true)}><XCircle className="h-4 w-4 mr-2" />Abandonner</Button>
            <Button onClick={() => { setApplyStock(false); setCloseOpen(true); }}><CheckCircle2 className="h-4 w-4 mr-2" />Clôturer l'inventaire</Button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{progress.counted} articles comptés / {progress.total}</span><span>{progress.percent} %</span>
          </div>
          <Progress value={progress.percent} />
        </div>
        <SearchWithScanner placeholder="Scanner ou rechercher un article…" value={search} onChange={setSearch} onScan={onScan} returnTo="/inventaire" />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <ul className="divide-y">
            {sorted.map((it) => {
              const raw = drafts[it.id] ?? (it.stock_compte ?? "").toString();
              const live = raw.trim() === "" ? null : Number(raw);
              const v = live === null || Number.isNaN(live) ? null : variance(it.stock_theorique, live);
              const tone = varianceTone(v);
              return (
                <li key={it.id} className={cn("flex items-center gap-3 px-4 py-3", it.stock_compte !== null && "bg-muted/30")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{it.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">{it.articles?.designation}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground w-16">
                    Théo.<div className="text-sm font-semibold text-foreground">{it.stock_theorique}</div>
                  </div>
                  <Input
                    type="number" inputMode="numeric" min={0} aria-label={`Quantité comptée ${it.reference}`}
                    className="w-20 text-center" value={raw}
                    onChange={(e) => onType(it.id, e.target.value)}
                    onBlur={(e) => { if (drafts[it.id] !== undefined) { clearTimeout(timers.current[it.id]); save(it.id, e.target.value); } }}
                  />
                  <div className={cn("w-12 text-right font-semibold tabular-nums", toneClass[tone])}>
                    {v === null ? "—" : v > 0 ? `+${v}` : v}
                  </div>
                  <div className="w-4">
                    {saving[it.id] ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      : it.stock_compte !== null ? <Check className="h-4 w-4 text-success" /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clôturer {inventory.reference} ?</DialogTitle>
            <DialogDescription>
              {progress.counted}/{progress.total} articles comptés · {variances.length} écart{variances.length > 1 ? "s" : ""}
              {progress.counted < progress.total && ` · ${progress.total - progress.counted} article(s) non compté(s), ignorés`}
            </DialogDescription>
          </DialogHeader>
          {variances.length > 0 && (
            <ul className="max-h-56 overflow-auto text-sm divide-y rounded-md border">
              {variances.map((i) => (
                <li key={i.id} className="flex justify-between px-3 py-2">
                  <span className="truncate">{i.reference}</span>
                  <span className={cn("font-semibold", toneClass[varianceTone(i.ecart)])}>
                    {i.stock_theorique} → {i.stock_compte} ({(i.ecart ?? 0) > 0 ? "+" : ""}{i.ecart})
                  </span>
                </li>
              ))}
            </ul>
          )}
          {variances.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={applyStock} onCheckedChange={(c) => setApplyStock(c === true)} className="mt-0.5" />
              Appliquer les écarts au stock réel (ajustement automatique)
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Retour</Button>
            <Button disabled={busy} onClick={() => (applyStock ? setConfirmApply(true) : doClose())}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmApply} onOpenChange={setConfirmApply}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le stock réel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le stock de {variances.length} article(s) sera remplacé par la quantité comptée. Un mouvement « Ajustement inventaire » sera enregistré pour chacun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doClose(); }} disabled={busy}>Confirmer l'ajustement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abandonner {inventory.reference} ?</DialogTitle>
            <DialogDescription>Le stock n'est pas modifié. Un nouvel inventaire pourra être ouvert.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Motif (facultatif)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbandonOpen(false)}>Retour</Button>
            <Button variant="destructive" disabled={busy} onClick={doAbandon}>Abandonner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
