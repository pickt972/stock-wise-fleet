import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Lock, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Inventaire {
  id: string;
  date_inventaire: string;
  date_creation: string;
  date_cloture?: string;
  statut: 'en_cours' | 'cloture' | 'valide';
  notes?: string;
}

interface InventaireActionsProps {
  inventaire: Inventaire;
  remainingItems: number;
  onStatusChange: () => void;
}

export function InventaireActions({ inventaire, remainingItems, onStatusChange }: InventaireActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<number>(0);
  const { toast } = useToast();

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return <Badge variant="secondary">En cours</Badge>;
      case 'cloture':
        return <Badge variant="outline">Clôturé</Badge>;
      case 'valide':
        return <Badge variant="default" className="bg-green-100 text-green-800">Validé</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

  const checkDiscrepancies = async () => {
    try {
      const { data, error } = await supabase
        .from('inventaire_items')
        .select('stock_theorique, stock_compte')
        .eq('inventaire_id', inventaire.id)
        .not('stock_theorique', 'is', null)
        .not('stock_compte', 'is', null);

      if (error) throw error;

      const discrepancyCount = data?.filter(
        item => item.stock_theorique !== item.stock_compte
      ).length || 0;

      setDiscrepancies(discrepancyCount);
      return discrepancyCount;
    } catch (error) {
      console.error('Erreur lors de la vérification des écarts:', error);
      return 0;
    }
  };

  const closeInventaire = async () => {
    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from('inventaires')
        .update({
          statut: 'cloture',
          date_cloture: new Date().toISOString(),
        })
        .eq('id', inventaire.id);

      if (error) throw error;

      toast({
        title: "✅ Inventaire clôturé",
        description: discrepancies > 0 
          ? `Inventaire clôturé avec ${discrepancies} écart(s) détecté(s).`
          : "L'inventaire a été clôturé avec succès.",
      });

      onStatusChange();
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de clôturer l'inventaire.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const validateInventaire = async () => {
    try {
      setIsUpdating(true);

      // Appliquer les corrections de stock pour tous les articles avec écart
      const { data: itemsWithVariance } = await supabase
        .from('inventaire_items')
        .select('article_id, stock_compte, ecart')
        .eq('inventaire_id', inventaire.id)
        .not('ecart', 'is', null)
        .neq('ecart', 0);

      if (itemsWithVariance && itemsWithVariance.length > 0) {
        for (const item of itemsWithVariance) {
          if (item.stock_compte !== null) {
            // Mettre à jour le stock réel de l'article
            const { error: stockError } = await supabase
              .from('articles')
              .update({ stock: item.stock_compte })
              .eq('id', item.article_id);

            if (stockError) throw stockError;

            // Créer un mouvement de stock pour traçabilité
            const { data: userResponse } = await supabase.auth.getUser();
            if (userResponse.user) {
              await supabase.from('stock_movements').insert({
                article_id: item.article_id,
                type: item.ecart! > 0 ? 'entree' : 'sortie',
                quantity: Math.abs(item.ecart!),
                motif: 'Correction inventaire',
                user_id: userResponse.user.id,
              });
            }
          }
        }
      }

      // Marquer l'inventaire comme validé
      const { error } = await supabase
        .from('inventaires')
        .update({
          statut: 'valide',
        })
        .eq('id', inventaire.id);

      if (error) throw error;

      toast({
        title: "Inventaire validé",
        description: "L'inventaire a été validé et les stocks ont été mis à jour.",
      });

      onStatusChange();
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider l'inventaire.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canClose = remainingItems === 0 && inventaire.statut === 'en_cours';
  const canValidate = inventaire.statut === 'cloture';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actions d'inventaire
          </span>
          {getStatusBadge(inventaire.statut)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Date: {format(new Date(inventaire.date_inventaire), 'dd MMMM yyyy', { locale: fr })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" />
            Créé le: {format(new Date(inventaire.date_creation), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </div>
          {inventaire.date_cloture && (
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4" />
              Clôturé le: {format(new Date(inventaire.date_cloture), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </div>
          )}
        </div>

        {inventaire.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{inventaire.notes}</p>
          </div>
        )}

        <div className="space-y-2">
          {inventaire.statut === 'en_cours' && (
            <>
              {remainingItems > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Il reste {remainingItems} article(s) à compter avant de pouvoir clôturer l'inventaire.
                  </p>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={!canClose || isUpdating}
                    className="w-full"
                    onClick={() => checkDiscrepancies()}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Clôturer l'inventaire
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {discrepancies > 0 ? "⚠️ Écarts détectés" : "Clôturer l'inventaire"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {discrepancies > 0 ? (
                        <>
                          <strong>{discrepancies} article(s) avec écarts détectés.</strong>
                          <br /><br />
                          Êtes-vous sûr de vouloir clôturer l'inventaire malgré les écarts?
                          Cette action empêchera toute modification ultérieure des comptages.
                        </>
                      ) : (
                        <>
                          Êtes-vous sûr de vouloir clôturer cet inventaire?
                          Cette action empêchera toute modification ultérieure des comptages.
                        </>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={closeInventaire}>
                      {discrepancies > 0 ? "Confirmer et clôturer" : "Clôturer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {inventaire.statut === 'cloture' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={!canValidate || isUpdating}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider et appliquer les corrections
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Valider l'inventaire</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va appliquer toutes les corrections de stock identifiées 
                    lors de l'inventaire et mettre à jour les stocks réels. 
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={validateInventaire}>
                    Valider et appliquer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {inventaire.statut === 'valide' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✓ Inventaire validé et stocks mis à jour
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}