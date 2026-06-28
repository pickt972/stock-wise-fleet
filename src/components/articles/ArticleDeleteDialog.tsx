import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Trash2, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ArticleDeleteDialogProps {
  article: {
    id: string;
    designation: string;
    stock: number;
  };
  onArticleDeleted: () => void;
}

export function ArticleDeleteDialog({ article, onArticleDeleted }: ArticleDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [movementCount, setMovementCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleOpen = async () => {
    // Compter les mouvements pour informer l'admin
    const { count } = await supabase
      .from("stock_movements")
      .select("id", { count: "exact", head: true })
      .eq("article_id", article.id);
    setMovementCount(count || 0);
    setForceConfirm(false);
    setOpen(true);
  };

  const handleArchive = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("articles")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", article.id);
      if (error) throw error;
      toast({ title: "✅ Article archivé", description: "L'article est masqué mais son historique est conservé." });
      setOpen(false);
      onArticleDeleted();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceDelete = async () => {
    setIsDeleting(true);
    try {
      await supabase.from("article_fournisseurs").delete().eq("article_id", article.id);
      await supabase.from("article_vehicules").delete().eq("article_id", article.id);
      // Les stock_movements ont ON DELETE CASCADE sur article_id
      const { error } = await supabase.from("articles").delete().eq("id", article.id);
      if (error) throw error;
      toast({ title: "✅ Article supprimé définitivement", description: `${article.designation} a été supprimé avec tout son historique.` });
      setOpen(false);
      onArticleDeleted();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {forceConfirm ? "⚠️ Suppression définitive — confirmer" : "Supprimer ou archiver ?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>{article.designation}</strong></p>
                  <p>Stock actuel : {article.stock} unités</p>
                  {movementCount > 0 && (
                    <p className="text-warning font-medium">
                      ⚠️ {movementCount} mouvement{movementCount > 1 ? "s" : ""} dans l'historique
                    </p>
                  )}
                </div>
                {!forceConfirm ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Archiver</strong> — l'article reste dans l'historique, marqué [ARCHIVÉ]. Recommandé si des mouvements existent.</p>
                    <p><strong className="text-destructive">Supprimer</strong> — suppression définitive avec tout l'historique associé. Irréversible.</p>
                  </div>
                ) : (
                  <p className="text-sm text-destructive font-medium">
                    Cette action supprimera définitivement l'article et {movementCount} mouvement{movementCount > 1 ? "s" : ""} associé{movementCount > 1 ? "s" : ""}. Impossible d'annuler.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            {!forceConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {isDeleting ? "Archivage..." : "Archiver"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setForceConfirm(true)}
                  disabled={isDeleting}
                >
                  Supprimer définitivement
                </Button>
              </>
            ) : (
              <AlertDialogAction
                onClick={handleForceDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Suppression..." : "Oui, supprimer définitivement"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
