import { useEffect, useState } from "react";
import { ScanLine, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { DraftArticleCompletionDialog } from "@/components/commandes/DraftArticleCompletionDialog";
import { receiveDraftLine, type PendingDraftLine } from "@/lib/receiveDraftLine";

export function PendingDraftReceptions({ onReceived }: { onReceived?: () => void }) {
  const { toast } = useToast();
  const [lines, setLines] = useState<PendingDraftLine[]>([]);
  const [scan, setScan] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [proposal, setProposal] = useState<PendingDraftLine | null>(null);
  const [editing, setEditing] = useState<{ line: PendingDraftLine; barcode: string | null } | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("commande_items")
      .select("id, commande_id, designation, quantite_commandee, quantite_recue, prix_unitaire, code_barre, commandes!inner(numero_commande, status)")
      .eq("is_draft", true)
      .is("article_id", null)
      .in("commandes.status", ["envoye", "confirme", "recu_partiel"]);
    setLines(((data as any[]) || [])
      .filter((l) => l.quantite_recue < l.quantite_commandee)
      .map((l) => ({ ...l, prix_unitaire: Number(l.prix_unitaire) || 0, numero_commande: l.commandes?.numero_commande || "" })));
  };
  useEffect(() => { load(); }, []);

  const onScan = async (code: string) => {
    setScan(false);
    const c = code.trim();
    const match = lines.find((l) => (l.code_barre || "").trim() === c);
    if (match) { setProposal(match); setScanned(c); return; }
    const { data: known } = await supabase.from("articles").select("designation").eq("code_barre", c).maybeSingle();
    if (known) {
      toast({ title: "Article déjà connu", description: `${known.designation} existe déjà : utilisez une entrée classique.` });
      return;
    }
    setScanned(c);
    toast({ title: `Code ${c}`, description: "Choisissez la ligne de commande correspondante ci-dessous." });
  };

  if (lines.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" /> Articles en attente de réception ({lines.length})
        </CardTitle>
        <Button size="sm" onClick={() => setScan(true)}><ScanLine className="h-4 w-4 mr-2" />Scanner</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {scanned && (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">
            Code-barres <strong>{scanned}</strong> : touchez la ligne correspondante pour compléter la fiche.
            <button className="ml-2 underline text-muted-foreground" onClick={() => setScanned(null)}>Annuler</button>
          </p>
        )}
        {lines.map((l) => (
          <button key={l.id} type="button" onClick={() => setEditing({ line: l, barcode: scanned || l.code_barre })}
            className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
            <span className="min-w-0">
              <span className="block font-medium truncate">{l.designation}</span>
              <span className="text-xs text-muted-foreground">Commande {l.numero_commande} • {l.quantite_commandee - l.quantite_recue} à recevoir</span>
            </span>
            <Badge variant="outline" className="shrink-0">📋 À créer</Badge>
          </button>
        ))}
      </CardContent>

      <BarcodeScanner isOpen={scan} onClose={() => setScan(false)} onScanResult={onScan} />

      <AlertDialog open={!!proposal} onOpenChange={(o) => !o && setProposal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Article reconnu</AlertDialogTitle>
            <AlertDialogDescription>
              Cet article correspond à <strong>{proposal?.designation.toUpperCase()}</strong> de la commande {proposal?.numero_commande} — Compléter la fiche ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (proposal) setEditing({ line: proposal, barcode: scanned }); setProposal(null); }}>Compléter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <DraftArticleCompletionDialog
          open
          designation={editing.line.designation}
          estimatedPrice={editing.line.prix_unitaire}
          initialBarcode={editing.barcode}
          position={`Commande ${editing.line.numero_commande}`}
          onSkip={() => setEditing(null)}
          onSubmit={async (c) => {
            try {
              const status = await receiveDraftLine(editing.line, c);
              toast({ title: "Article reçu", description: status === "recu_complet" ? "Commande entièrement reçue" : "Commande partiellement reçue" });
              setEditing(null); setScanned(null);
              await load(); onReceived?.();
            } catch (e: any) {
              toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
          }}
        />
      )}
    </Card>
  );
}
