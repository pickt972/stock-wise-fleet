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
import { Trash2 } from "lucide-react";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Vérifier si l'article a un historique de mouvements
      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('article_id', article.id)
        .limit(1);

      if (movementsError) throw movementsError;

      if (movements && movements.length > 0) {
        toast({
          title: "Suppression impossible",
          description: "Cet article a un historique de mouvements. Veuillez le désactiver au lieu de le supprimer.",
          variant: "destructive",
        });
        setOpen(false);
        setIsDeleting(false);
        return;
      }

      // Supprimer l'article
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: "✅ Article supprimé",
        description: "L'article a été supprimé avec succès",
      });

      setOpen(false);
      onArticleDeleted();
    } catch (error: any) {
      console.error('Erreur suppression article:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'article",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">
                Êtes-vous sûr de vouloir supprimer cet article ?
              </p>
              <div className="bg-muted p-3 rounded-md space-y-1">
                <p><strong>Nom:</strong> {article.designation}</p>
                <p><strong>Stock actuel:</strong> {article.stock} unités</p>
              </div>
              <p className="text-destructive">
                ⚠️ Cette action est irréversible.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Confirmer la suppression"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
