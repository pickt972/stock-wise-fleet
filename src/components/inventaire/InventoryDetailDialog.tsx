import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2 } from "lucide-react";
import { formatDuration, itemsWithVariance, statusLabel, varianceTone } from "@/lib/inventory";
import { fetchItems, fmtDateTime, type InventoryRow } from "./inventoryData";
import { cn } from "@/lib/utils";

export function InventoryDetailDialog({ inventory, names, scopeLabel, onOpenChange }: {
  inventory: InventoryRow | null; names: Record<string, string>; scopeLabel: string;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-items", inventory?.id],
    enabled: !!inventory,
    queryFn: () => fetchItems(inventory!.id),
  });
  if (!inventory) return null;

  const variances = itemsWithVariance(items).sort((a, b) => (a.ecart ?? 0) - (b.ecart ?? 0));
  const st = statusLabel(inventory.statut);
  const name = (id: string | null) => (id ? names[id] ?? "Utilisateur inconnu" : "—");
  const end = inventory.closed_at ?? inventory.abandoned_at;
  const meta: [string, string][] = [
    ["N°", inventory.reference ?? "—"],
    ["Libellé", inventory.label ?? "—"],
    ["Périmètre", scopeLabel],
    ["Statut", st.label],
    ["Ouvert par", name(inventory.created_by)],
    ["Ouvert le", fmtDateTime(inventory.opened_at)],
    ...(inventory.statut === "abandonne"
      ? [["Abandonné par", name(inventory.abandoned_by)], ["Abandonné le", fmtDateTime(inventory.abandoned_at)], ["Motif", inventory.abandon_reason ?? "—"]] as [string, string][]
      : [["Clôturé par", name(inventory.closed_by)], ["Clôturé le", fmtDateTime(inventory.closed_at)]] as [string, string][]),
    ["Durée", end ? formatDuration(inventory.opened_at, end) : "—"],
    ["Articles comptés", `${inventory.articles_counted}/${inventory.total_articles}`],
    ["Stock ajusté", inventory.stock_applied ? "Oui" : "Non"],
  ];

  const exportPdf = () => {
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16); doc.text(`Inventaire ${inventory.reference ?? ""}`, 14, y); y += 10;
    doc.setFontSize(10);
    meta.forEach(([k, v]) => { doc.text(`${k} : ${v}`, 14, y); y += 6; });
    y += 4; doc.setFontSize(12); doc.text(`Écarts (${variances.length})`, 14, y); y += 7;
    doc.setFontSize(9);
    const head = () => { doc.text("Référence", 14, y); doc.text("Désignation", 50, y); doc.text("Théo.", 150, y); doc.text("Compté", 165, y); doc.text("Écart", 185, y); y += 5; };
    head();
    variances.forEach((i) => {
      if (y > 280) { doc.addPage(); y = 18; head(); }
      doc.text(String(i.reference ?? ""), 14, y);
      doc.text(String(i.articles?.designation ?? "").slice(0, 55), 50, y);
      doc.text(String(i.stock_theorique), 150, y);
      doc.text(String(i.stock_compte), 165, y);
      doc.text(`${(i.ecart ?? 0) > 0 ? "+" : ""}${i.ecart}`, 185, y);
      y += 5;
    });
    if (variances.length === 0) doc.text("Aucun écart.", 14, y);
    doc.save(`${inventory.reference ?? "inventaire"}.pdf`);
  };

  return (
    <Dialog open={!!inventory} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {inventory.reference} <Badge variant="secondary">{st.emoji} {st.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {meta.map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
        <div className="flex items-center justify-between pt-2">
          <h3 className="font-semibold">Écarts ({variances.length})</h3>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={isLoading}><FileDown className="h-4 w-4 mr-2" />Exporter en PDF</Button>
        </div>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : variances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun écart : toutes les quantités comptées correspondent au stock théorique.</p>
        ) : (
          <div className="rounded-md border divide-y text-sm">
            {variances.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1"><p className="font-medium truncate">{i.reference}</p><p className="text-xs text-muted-foreground truncate">{i.articles?.designation}</p></div>
                <span className="text-muted-foreground">{i.stock_theorique} → {i.stock_compte}</span>
                <span className={cn("w-12 text-right font-semibold", varianceTone(i.ecart) === "negative" ? "text-destructive" : "text-success")}>
                  {(i.ecart ?? 0) > 0 ? "+" : ""}{i.ecart}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
