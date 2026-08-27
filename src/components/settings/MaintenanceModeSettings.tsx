import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_MESSAGE =
  "Migration de la base de données en cours. Merci de noter vos opérations sur papier.";

export function MaintenanceModeSettings() {
  const { active, message, isLoading, setMaintenance } = useMaintenanceMode();
  const { toast } = useToast();
  const [draftMessage, setDraftMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftMessage(message || "");
  }, [message]);

  const apply = async (nextActive: boolean) => {
    setSaving(true);
    try {
      await setMaintenance(nextActive, nextActive ? draftMessage || DEFAULT_MESSAGE : draftMessage);
      toast({
        title: nextActive ? "Mode maintenance activé" : "Mode maintenance désactivé",
        description: nextActive
          ? "Toute saisie est gelée pour les non-administrateurs."
          : "Les utilisateurs peuvent à nouveau saisir des données.",
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0">
          <Label className="text-sm font-semibold">Mode maintenance</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Gèle toute création, modification et suppression pour les non-administrateurs,
            y compris au niveau de la base de données.
          </p>
        </div>
        <Switch
          checked={active}
          disabled={saving}
          onCheckedChange={(v) => (v ? setConfirmOpen(true) : apply(false))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maintenance_message">Message affiché aux utilisateurs</Label>
        <Textarea
          id="maintenance_message"
          rows={3}
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder={DEFAULT_MESSAGE}
        />
      </div>

      {active && (
        <Button onClick={() => apply(true)} disabled={saving} variant="outline" className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mettre à jour le message
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Activer le mode maintenance ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tous les utilisateurs non administrateurs seront immédiatement bloqués : plus aucune
              entrée, sortie, transfert ni modification ne sera possible, même s'ils sont déjà connectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); apply(true); }} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
