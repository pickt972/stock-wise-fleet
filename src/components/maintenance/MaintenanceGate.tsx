import { AlertTriangle, PenLine, Wrench } from "lucide-react";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useRoleAccess } from "@/hooks/useRoleAccess";

/**
 * Bloque toute l'interface pendant une maintenance pour les non-admins.
 * Les admins voient un bandeau d'avertissement et conservent l'accès complet.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { active, message, isLoading } = useMaintenanceMode();
  const { isAdmin } = useRoleAccess();

  if (isLoading || !active) return <>{children}</>;

  if (isAdmin()) {
    return (
      <>
        <div className="sticky top-0 z-[60] flex items-start gap-3 border-b border-warning/30 bg-warning/15 px-4 py-2.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <span className="font-semibold">Mode maintenance actif</span>
            <span className="text-muted-foreground">
              {" "}— les utilisateurs non administrateurs ne peuvent plus saisir de données.
              {message ? ` Message affiché : « ${message} »` : ""}
            </span>
          </div>
        </div>
        {children}
      </>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-background px-5 py-10"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Maintenance en cours</h1>
          <p className="text-sm text-muted-foreground">
            {message || "L'application est temporairement indisponible. Merci de patienter."}
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-left">
          <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Notez vos opérations (entrées, sorties, transferts) <span className="font-medium text-foreground">sur papier</span>.
            Vous pourrez les saisir dès la fin de la maintenance.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Cet écran disparaîtra automatiquement à la réouverture, sans rafraîchir la page.
        </p>
      </div>
    </div>
  );
}
