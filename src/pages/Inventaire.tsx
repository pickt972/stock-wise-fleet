import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, TrendingUp, Plus, ClipboardCheck, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeletons/PageSkeleton";
import { NewInventoryDialog } from "@/components/inventaire/NewInventoryDialog";
import { InventoryCounting } from "@/components/inventaire/InventoryCounting";
import { InventoryDetailDialog } from "@/components/inventaire/InventoryDetailDialog";
import { fetchNames, fmtDateTime, type InventoryRow } from "@/components/inventaire/inventoryData";
import { statusLabel } from "@/lib/inventory";
import { useToast } from "@/hooks/use-toast";
import { inventoryPlaceLabel } from "@/components/inventaire/newInventoryArticle";

export default function Inventaire() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<InventoryRow | null>(null);

  const { data: articles = [] } = useQuery({
    queryKey: ["inventory-articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("stock, stock_min, prix_achat").is("archived_at", null);
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inventories"],
    queryFn: async () => {
      const { data: invs, error } = await supabase
        .from("inventaires").select("*").not("reference", "is", null).order("opened_at", { ascending: false });
      if (error) throw error;
      const rows = invs as unknown as InventoryRow[];
      const ids = rows.map((r) => r.id);
      const [names, varRes, cats, emps] = await Promise.all([
        fetchNames(rows.flatMap((r) => [r.created_by, r.closed_by, r.abandoned_by])),
        ids.length ? supabase.from("inventaire_items").select("inventaire_id").in("inventaire_id", ids).not("ecart", "is", null).neq("ecart", 0) : Promise.resolve({ data: [] as any[] }),
        supabase.from("categories").select("id, nom"),
        supabase.from("emplacements").select("id, nom"),
      ]);
      const variances: Record<string, number> = {};
      (varRes.data ?? []).forEach((v: any) => { variances[v.inventaire_id] = (variances[v.inventaire_id] ?? 0) + 1; });
      const scopeNames: Record<string, string> = {};
      [...(cats.data ?? []), ...(emps.data ?? [])].forEach((x: any) => { scopeNames[x.id] = x.nom; });
      return { rows, names, variances, scopeNames };
    },
  });

  const rows = data?.rows ?? [];
  const names = data?.names ?? {};
  const active = rows.find((r) => r.statut === "en_cours") ?? null;
  const lastClosed = rows.find((r) => r.statut === "cloture" || r.statut === "valide");

  const kpi = useMemo(() => ({
    value: articles.reduce((s, a) => s + a.stock * a.prix_achat, 0),
    total: articles.length,
    low: articles.filter((a) => a.stock <= a.stock_min).length,
  }), [articles]);

  const scopeLabel = (r: InventoryRow) =>
    r.scope_type === "all" ? "Tous les articles"
      : `${r.scope_type === "category" ? "Catégorie" : "Emplacement"} : ${data?.scopeNames[r.scope_id ?? ""] ?? "—"}`;
  const name = (id: string | null) => (id ? names[id] ?? "Utilisateur inconnu" : "—");

  const startNew = () => {
    if (active) { toast({ title: "Un inventaire est déjà en cours", description: `Clôturez ou abandonnez ${active.reference} d'abord.`, variant: "destructive" }); return; }
    setNewOpen(true);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["inventories"] });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventaire</h1>
            <p className="text-muted-foreground">Comptages, écarts et historique des inventaires</p>
          </div>
          <Button onClick={startNew} disabled={!!active} title={active ? "Un inventaire est déjà en cours" : undefined}>
            <Plus className="h-4 w-4 mr-2" />Nouvel inventaire
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Kpi title="Valeur totale du stock" icon={TrendingUp} value={`${kpi.value.toFixed(2)} €`} />
          <Kpi title="Total des articles" icon={Package} value={String(kpi.total)} />
          <Kpi title="Articles en stock faible" icon={AlertTriangle} value={String(kpi.low)} valueClass="text-destructive" />
          <Kpi title="Dernier inventaire" icon={ClipboardCheck}
            value={lastClosed ? new Date(lastClosed.closed_at!).toLocaleDateString("fr-FR") : "—"}
            sub={lastClosed ? `par ${name(lastClosed.closed_by ?? lastClosed.created_by)}` : "Aucun inventaire clôturé"} />
        </div>

        {active && (
          <InventoryCounting inventory={active} openerName={name(active.created_by)}
            placeLabel={inventoryPlaceLabel(active.scope_type, data?.scopeNames[active.scope_id ?? ""])} onFinished={refresh} />
        )}

        <Card>
          <CardHeader><CardTitle>Inventaires</CardTitle></CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {isLoading ? <PageSkeleton /> : rows.length === 0 ? (
              <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="Aucun inventaire" description="Ouvrez votre premier inventaire pour compter le stock."
                action={{ label: "Nouvel inventaire", onClick: startNew }} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead><TableHead>Statut</TableHead><TableHead>Ouvert le</TableHead>
                      <TableHead>Par</TableHead><TableHead>Clôturé le</TableHead>
                      <TableHead className="text-center">Articles comptés</TableHead><TableHead className="text-center">Écarts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const st = statusLabel(r.statut);
                      const n = data?.variances[r.id] ?? 0;
                      return (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => r.statut === "en_cours"
                          ? window.scrollTo({ top: 0, behavior: "smooth" })
                          : setDetail(r)}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {r.reference}{r.label && <div className="text-xs text-muted-foreground font-normal">{r.label}</div>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap"><Badge variant="secondary">{st.emoji} {st.label}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDateTime(r.opened_at)}</TableCell>
                          <TableCell className="whitespace-nowrap">{name(r.created_by)}</TableCell>
                          <TableCell className="whitespace-nowrap">{r.statut === "abandonne" ? "—" : fmtDateTime(r.closed_at)}</TableCell>
                          <TableCell className="text-center">{r.articles_counted}/{r.total_articles}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {r.statut === "en_cours" || r.statut === "abandonne" ? "—" : n === 0 ? "Aucun" : `${n} écart${n > 1 ? "s" : ""}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewInventoryDialog open={newOpen} onOpenChange={setNewOpen} onCreated={() => { setNewOpen(false); refresh(); }} />
      <InventoryDetailDialog inventory={detail} names={names} scopeLabel={detail ? scopeLabel(detail) : ""}
        onOpenChange={(o) => !o && setDetail(null)} />
    </DashboardLayout>
  );
}

function Kpi({ title, icon: Icon, value, sub, valueClass }: {
  title: string; icon: React.ComponentType<{ className?: string }>; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}
