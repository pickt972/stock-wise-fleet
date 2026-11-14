import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_VERSION, APP_VERSION_DATE } from "@/version";
import { CHANGELOG } from "@/changelog";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function AboutSection() {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">À propos</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Stock-Wise Fleet v{APP_VERSION}</p>
            <p className="text-sm text-muted-foreground">Dernière mise à jour : {formatDate(APP_VERSION_DATE)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Voir les changements</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historique des versions</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {CHANGELOG.slice(0, 5).map((e) => (
              <div key={e.version}>
                <p className="font-semibold">v{e.version} <span className="text-sm font-normal text-muted-foreground">— {formatDate(e.date)}</span></p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                  {e.changes.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
