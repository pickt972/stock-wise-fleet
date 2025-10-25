import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, PlusCircle, FileText, MoreVertical, Trash2, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";
import { EditArticleDialog } from "@/components/articles/EditArticleDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  stock_max: number;
  prix_achat: number;
  emplacement: string;
  code_barre?: string;
  created_at: string;
  updated_at: string;
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setArticle(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'article",
        variant: "destructive",
      });
      navigate('/articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      // Supprimer d'abord les dépendances
      await supabase.from('article_fournisseurs').delete().eq('article_id', id);
      await supabase.from('article_vehicules').delete().eq('article_id', id);
      
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article supprimé avec succès",
      });
      
      navigate('/articles');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'article",
        variant: "destructive",
      });
    }
  };

  const getStockBadge = () => {
    if (!article) return null;
    
    if (article.stock === 0) {
      return <Badge variant="destructive">Rupture de stock</Badge>;
    }
    if (article.stock <= article.stock_min) {
      return <Badge variant="secondary">Stock faible</Badge>;
    }
    return <Badge variant="default">Stock OK</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!article) {
    return null;
  }

  const lastUpdate = new Date(article.updated_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={article.designation} showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Info principale */}
          <Card className="p-5 bg-muted/30 border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      Quantité: {article.stock}
                    </div>
                    {getStockBadge()}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-base">
                <div>
                  <div className="text-muted-foreground text-sm">Catégorie</div>
                  <div className="font-medium">{article.categorie}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Marque</div>
                  <div className="font-medium">{article.marque}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Référence</div>
                  <div className="font-medium">{article.reference}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Emplacement</div>
                  <div className="font-medium">{article.emplacement || '-'}</div>
                </div>
                {article.code_barre && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-sm">Code-barres</div>
                    <div className="font-medium font-mono">{article.code_barre}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-muted-foreground text-sm">Dernière mise à jour</div>
                  <div className="text-sm">{lastUpdate}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <ActionButton
              variant="primary"
              size="xxl"
              className="w-full"
              icon={<Edit className="h-6 w-6" />}
              onClick={() => setShowEditDialog(true)}
            >
              Modifier l'article
            </ActionButton>

            <ActionButton
              variant="success"
              size="xxl"
              className="w-full"
              icon={<PlusCircle className="h-6 w-6" />}
              onClick={() => navigate('/entrees', { state: { prefilledArticleId: article.id } })}
            >
              Ajouter du stock
            </ActionButton>

            <ActionButton
              variant="primary"
              size="xxl"
              className="w-full"
              icon={<FileText className="h-6 w-6" />}
              onClick={() => navigate('/historique-articles', { state: { articleId: article.id } })}
            >
              Voir l'historique
            </ActionButton>
          </div>

          {/* Menu secondaire */}
          <div className="pt-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton variant="outline" size="xl" className="w-full">
                  <MoreVertical className="h-5 w-5 mr-2" />
                  Plus d'options
                </ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer l'article
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showEditDialog && (
        <EditArticleDialog
          article={article}
          onArticleUpdated={() => {
            fetchArticle();
            setShowEditDialog(false);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'article "{article.designation}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
