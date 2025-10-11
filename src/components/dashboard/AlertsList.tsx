import { AlertTriangle, Package, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAlerts } from "@/hooks/useAlerts";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { DraftOrderCheckDialog } from "@/components/commandes/DraftOrderCheckDialog";

export function AlertsList() {
  const navigate = useNavigate();
  const { alerts, alertsByCategory, isLoading } = useAlerts();
  const [draftDialog, setDraftDialog] = useState<{
    isOpen: boolean;
    draftOrder: any;
    articleForOrder: any;
  }>({ isOpen: false, draftOrder: null, articleForOrder: null });

  const handleCreateOrderForAlert = async (alert: any) => {
    const articleForOrder = {
      article_id: alert.article.id,
      designation: alert.article.designation,
      reference: alert.article.reference,
      quantite_commandee: alert.type === "rupture" ? Math.max(alert.article.stock_min * 2, 10) : alert.article.stock_min - alert.article.stock + 5,
      prix_unitaire: alert.article.prix_achat,
      total_ligne: 0
    };

    // Récupérer le fournisseur principal de l'article
    const { data: articleFournisseurs } = await supabase
      .from('article_fournisseurs')
      .select('fournisseur_id, fournisseurs(nom)')
      .eq('article_id', alert.article.id)
      .eq('est_principal', true)
      .eq('actif', true)
      .single();

    let fournisseurNom = null;
    if (articleFournisseurs?.fournisseurs) {
      fournisseurNom = (articleFournisseurs.fournisseurs as any).nom;
    }

    // Vérifier s'il existe une commande en brouillon pour ce fournisseur
    if (fournisseurNom) {
      const { data: existingDrafts } = await supabase
        .from('commandes')
        .select('id, numero_commande, fournisseur, total_ht, commande_items(*)')
        .eq('fournisseur', fournisseurNom)
        .eq('status', 'brouillon')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingDrafts && existingDrafts.length > 0) {
        const existingOrder = existingDrafts[0];
        setDraftDialog({
          isOpen: true,
          draftOrder: {
            id: existingOrder.id,
            numero_commande: existingOrder.numero_commande || "Brouillon",
            fournisseur: existingOrder.fournisseur,
            total_ht: existingOrder.total_ht,
            items: existingOrder.commande_items || []
          },
          articleForOrder: { ...articleForOrder, fournisseurNom }
        });
        return;
      }
    }

    // Pas de commande brouillon, créer une nouvelle
    navigate('/commandes', { 
      state: { 
        prefilledItems: [articleForOrder],
        fournisseurNom,
        source: 'dashboard-alert'
      } 
    });
  };

  const handleAddToExisting = () => {
    navigate('/commandes', { 
      state: { 
        prefilledItems: [draftDialog.articleForOrder],
        fournisseurNom: draftDialog.articleForOrder.fournisseurNom,
        source: 'dashboard-alert'
      } 
    });
    setDraftDialog({ isOpen: false, draftOrder: null, articleForOrder: null });
  };

  const handleCreateNew = () => {
    navigate('/commandes', { 
      state: { 
        prefilledItems: [draftDialog.articleForOrder],
        fournisseurNom: draftDialog.articleForOrder.fournisseurNom,
        source: 'dashboard-alert',
        forceNewOrder: true
      } 
    });
    setDraftDialog({ isOpen: false, draftOrder: null, articleForOrder: null });
  };

  // Afficher seulement les 3 premières alertes
  const displayAlerts = alerts.slice(0, 3);
  const totalCategories = alertsByCategory.length;

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertes Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertes Stock
            {totalCategories > 0 && (
              <Badge variant="outline" className="text-xs">
                {totalCategories} catégories
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayAlerts.length > 0 ? (
            displayAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-3 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div 
                  className="flex items-start gap-3 flex-1 cursor-pointer"
                  onClick={() => handleCreateOrderForAlert(alert)}
                >
                  <div className="mt-0.5">
                    {alert.type === "rupture" ? (
                      <Package className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-medium text-foreground hover:text-primary transition-colors">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.category}
                      </Badge>
                      <span className="text-xs text-primary">Cliquer pour commander</span>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={alert.priority === "high" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {alert.priority === "high" ? "Urgent" : "Attention"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Aucune alerte de stock
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate('/alertes')}
          >
            Voir toutes les alertes{totalCategories > 0 && ` (${totalCategories} catégories)`}
          </Button>
        </CardContent>
      </Card>

      <DraftOrderCheckDialog
        isOpen={draftDialog.isOpen}
        onClose={() => setDraftDialog({ isOpen: false, draftOrder: null, articleForOrder: null })}
        draftOrder={draftDialog.draftOrder}
        onAddToExisting={handleAddToExisting}
        onCreateNew={handleCreateNew}
      />
    </>
  );
}