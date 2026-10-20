import { vehicleLabel } from "@/lib/vehicleFormatting";
import { useEffect, useMemo, useState } from "react";
import { ScanLine, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { ReceiveLineDialog } from "./ReceiveLineDialog";
import { useToast } from "@/hooks/use-toast";
import { lineStatus, LINE_STATUS_LABEL, type OrderLine } from "@/lib/receiveDraftLine";

/** Validated orders awaiting reception; each line is received independently. */
export function PendingDraftReceptions({ onReceived, onUnknownScan }: { onReceived?: () => void; onUnknownScan?: (code: string) => void }) {
  const { toast } = useToast();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [scan, setScan] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [editing, setEditing] = useState<OrderLine | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("commande_items")
      .select("id, commande_id, designation, article_id, quantite_commandee, quantite_recue, prix_unitaire, code_barre, categorie, sous_categorie, precision_note, vehicule_id, vehicule_libre, vehicules(immatriculation, marque, modele), commandes!inner(numero_commande, status)")
      .in("commandes.status", ["envoye", "confirme", "recu_partiel"]);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setLines(((data as any[]) || [])
      .filter((l) => l.quantite_recue < l.quantite_commandee)
      .map((l) => ({
        ...l, prix_unitaire: Number(l.prix_unitaire) || 0, numero_commande: l.commandes?.numero_commande || "",
        vehicule_label: l.vehicules ? vehicleLabel(l.vehicules) : (l.vehicule_libre || null),
      })));
  };
  useEffect(() => { load(); }, []);

  const byOrder = useMemo(() => {
    const m = new Map<string, OrderLine[]>();
    lines.forEach((l) => m.set(l.numero_commande, [...(m.get(l.numero_commande) || []), l]));
    return Array.from(m.entries());
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" /> Commandes en attente de réception ({lines.length} ligne{lines.length > 1 ? "s" : ""})
        </CardTitle>
        <Button size="sm" onClick={() => setScan(true)}><ScanLine className="h-4 w-4 mr-2" />Scanner</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {scanned && (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">
            Code-barres <strong>{scanned}</strong> : choisissez la ligne à réceptionner.
            <button className="ml-2 underline text-muted-foreground" onClick={() => setScanned(null)}>Annuler</button>
          </p>
        )}
        {byOrder.map(([numero, ls]) => (
          <div key={numero} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Commande {numero}</p>
            {ls.map((l) => {
              const st = lineStatus(l);
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium truncate">
                      {l.categorie ? `${l.categorie}${l.sous_categorie ? ` › ${l.sous_categorie}` : ""}` : l.designation}
                    </p>
                    {l.precision_note && <p className="text-xs italic text-muted-foreground">« {l.precision_note} »</p>}
                    {l.vehicule_label && <p className="text-xs font-medium text-accent">🚗 {l.vehicule_label}</p>}
                    <p className="text-xs text-muted-foreground">
                      {l.quantite_recue}/{l.quantite_commandee} reçu(s) •{" "}
                      <Badge variant="outline" className={st === "partiel" ? "border-warning/40 text-warning" : ""}>{LINE_STATUS_LABEL[st]}</Badge>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setEditing(l)}>Réceptionner</Button>
                </div>
              );
            })}
          </div>
        ))}
      </CardContent>

      <BarcodeScanner isOpen={scan} onClose={() => setScan(false)} onScanResult={(c: string) => {
        setScan(false);
        const code = c.trim();
        const match = lines.find((l) => (l.code_barre || "").trim() === code);
        if (match) { setEditing(match); }
        else if (onUnknownScan) onUnknownScan(code);
        else setScanned(code);
      }} />

      {editing && (
        <ReceiveLineDialog
          line={editing}
          initialBarcode={scanned}
          onClose={() => setEditing(null)}
          onDone={async () => { setEditing(null); setScanned(null); await load(); onReceived?.(); }}
        />
      )}
    </Card>
  );
}
