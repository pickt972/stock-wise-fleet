import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ShoppingCart, Package, AlertTriangle, Loader2 } from "lucide-react";

interface SmartOrderItem {
  article_id: string;
  designation: string;
  reference: string;
  quantite_commandee: number;
  prix_unitaire: number;
  total_ligne: number;
  fournisseur: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
}

interface GroupedBySupplier {
  [key: string]: {
    fournisseur: {
      id: string;
      nom: string;
      email?: string;
      telephone?: string;
      adresse?: string;
    };
    items: SmartOrderItem[];
    total_ht: number;
    total_ttc: number;
  };
}

interface SmartOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOrdersCreated: () => void;
}

export const SmartOrderDialog = ({ isOpen, onClose, onOrdersCreated }: SmartOrderDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [groupedOrders, setGroupedOrders] = useState<GroupedBySupplier>({});
  const [isCreatingOrders, setIsCreatingOrders] = useState(false);
  const { toast } = useToast();

  const calculateSmartOrders = async () => {
    setIsLoading(true);
    try {
      // Récupérer les articles avec stock faible ou en rupture via article_fournisseurs
      const { data: articleFournisseurs, error } = await supabase
        .from('article_fournisseurs')
        .select(`
          article_id,
          fournisseur_id,
          prix_fournisseur,
          est_principal,
          actif,
          articles!inner (
            id,
            designation,
            reference,
            stock,
            stock_min,
            prix_achat
          ),
          fournisseurs!inner (
            id,
            nom,
            email,
            telephone,
            adresse,
            actif
          )
        `)
        .eq('actif', true)
        .eq('fournisseurs.actif', true);

      if (error) throw error;

      // Filtrer côté client les articles avec stock faible ou en rupture
      const articlesToOrder = articleFournisseurs?.filter(af => {
        const article = af.articles;
        return article && (article.stock === 0 || article.stock <= article.stock_min);
      }) || [];

      // Grouper par fournisseur (priorité aux fournisseurs principaux)
      const grouped: GroupedBySupplier = {};
      
      // D'abord, traiter les fournisseurs principaux
      const principalSuppliers = articlesToOrder.filter(af => af.est_principal);
      const nonPrincipalSuppliers = articlesToOrder.filter(af => !af.est_principal);
      
      // Fonction pour traiter un fournisseur
      const processSupplier = (af: any) => {
        const article = af.articles;
        const fournisseur = af.fournisseurs;
        
        // Vérifier si l'article a déjà été traité par un fournisseur principal
        const alreadyProcessed = Object.values(grouped).some(group => 
          group.items.some(item => item.article_id === article.id)
        );
        
        if (alreadyProcessed && !af.est_principal) {
          return; // Skip si déjà traité par un fournisseur principal
        }

        const quantiteACommander = article.stock === 0 
          ? Math.max(article.stock_min * 2, 10) // Rupture : 2x le stock min ou 10 minimum
          : article.stock_min - article.stock + 5; // Stock faible : complément + marge

        const prixUnitaire = af.prix_fournisseur || article.prix_achat;

        const item: SmartOrderItem = {
          article_id: article.id,
          designation: article.designation,
          reference: article.reference,
          quantite_commandee: quantiteACommander,
          prix_unitaire: prixUnitaire,
          total_ligne: quantiteACommander * prixUnitaire,
          fournisseur: fournisseur
        };

        const fournisseurId = fournisseur.id;

        if (!grouped[fournisseurId]) {
          grouped[fournisseurId] = {
            fournisseur: fournisseur,
            items: [],
            total_ht: 0,
            total_ttc: 0,
          };
        }

        // Si c'est un fournisseur principal et que l'article existe déjà, remplacer
        if (af.est_principal) {
          // Supprimer l'article de tous les autres fournisseurs
          Object.keys(grouped).forEach(otherId => {
            if (otherId !== fournisseurId) {
              const otherGroup = grouped[otherId];
              const itemIndex = otherGroup.items.findIndex(i => i.article_id === article.id);
              if (itemIndex >= 0) {
                const removedItem = otherGroup.items.splice(itemIndex, 1)[0];
                otherGroup.total_ht -= removedItem.total_ligne;
                otherGroup.total_ttc = otherGroup.total_ht * 1.2;
              }
            }
          });
        }

        grouped[fournisseurId].items.push(item);
        grouped[fournisseurId].total_ht += item.total_ligne;
        grouped[fournisseurId].total_ttc = grouped[fournisseurId].total_ht * 1.2; // TVA 20%
      };

      // Traiter d'abord les fournisseurs principaux
      principalSuppliers.forEach(processSupplier);
      
      // Puis traiter les non-principaux pour les articles restants
      nonPrincipalSuppliers.forEach(processSupplier);

      // Nettoyer les fournisseurs sans articles
      Object.keys(grouped).forEach(fournisseurId => {
        if (grouped[fournisseurId].items.length === 0) {
          delete grouped[fournisseurId];
        }
      });

      setGroupedOrders(grouped);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      calculateSmartOrders();
    }
  }, [isOpen]);

  const createOrdersForAllSuppliers = async () => {
    setIsCreatingOrders(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const [fournisseurId, orderData] of Object.entries(groupedOrders)) {
        // Créer la commande
        const { data: commande, error: commandeError } = await supabase
          .from('commandes')
          .insert([{
            fournisseur: orderData.fournisseur.nom,
            email_fournisseur: orderData.fournisseur.email,
            telephone_fournisseur: orderData.fournisseur.telephone,
            adresse_fournisseur: orderData.fournisseur.adresse,
            status: 'brouillon',
            total_ht: orderData.total_ht,
            total_ttc: orderData.total_ttc,
            tva_taux: 20,
            user_id: user?.id,
            numero_commande: '' // Sera généré par le trigger
          }])
          .select()
          .single();

        if (commandeError) throw commandeError;

        // Créer les items de commande
        const itemsToInsert = orderData.items.map(item => ({
          commande_id: commande.id,
          article_id: item.article_id,
          designation: item.designation,
          reference: item.reference,
          quantite_commandee: item.quantite_commandee,
          prix_unitaire: item.prix_unitaire,
          total_ligne: item.total_ligne
        }));

        const { error: itemsError } = await supabase
          .from('commande_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Succès",
        description: `${Object.keys(groupedOrders).length} commande(s) créée(s) avec succès`,
      });

      onOrdersCreated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrders(false);
    }
  };

  const createOrderForSupplier = async (fournisseurId: string) => {
    setIsCreatingOrders(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orderData = groupedOrders[fournisseurId];
      
      // Créer la commande
      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert([{
          fournisseur: orderData.fournisseur.nom,
          email_fournisseur: orderData.fournisseur.email,
          telephone_fournisseur: orderData.fournisseur.telephone,
          adresse_fournisseur: orderData.fournisseur.adresse,
          status: 'brouillon',
          total_ht: orderData.total_ht,
          total_ttc: orderData.total_ttc,
          tva_taux: 20,
          user_id: user?.id,
          numero_commande: ''
        }])
        .select()
        .single();

      if (commandeError) throw commandeError;

      // Créer les items
      const itemsToInsert = orderData.items.map(item => ({
        commande_id: commande.id,
        article_id: item.article_id,
        designation: item.designation,
        reference: item.reference,
        quantite_commandee: item.quantite_commandee,
        prix_unitaire: item.prix_unitaire,
        total_ligne: item.total_ligne
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Succès",
        description: `Commande créée pour ${orderData.fournisseur.nom}`,
      });

      // Retirer ce fournisseur de la liste
      const newGroupedOrders = { ...groupedOrders };
      delete newGroupedOrders[fournisseurId];
      setGroupedOrders(newGroupedOrders);
      
      if (Object.keys(newGroupedOrders).length === 0) {
        onOrdersCreated();
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrders(false);
    }
  };

  const totalSuppliers = Object.keys(groupedOrders).length;
  const totalItems = Object.values(groupedOrders).reduce((sum, order) => sum + order.items.length, 0);
  const grandTotal = Object.values(groupedOrders).reduce((sum, order) => sum + order.total_ttc, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Commande Intelligente
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Analyse des stocks en cours...
          </div>
        ) : totalSuppliers === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun article à commander</h3>
            <p className="text-muted-foreground">
              Tous les stocks sont suffisants ou aucun fournisseur n'est associé aux articles en alerte.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Résumé */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé de la commande intelligente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalSuppliers}</div>
                    <div className="text-sm text-muted-foreground">Fournisseur(s)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalItems}</div>
                    <div className="text-sm text-muted-foreground">Article(s)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} €</div>
                    <div className="text-sm text-muted-foreground">Total TTC</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-center">
                  <Button
                    onClick={createOrdersForAllSuppliers}
                    disabled={isCreatingOrders}
                    className="w-full md:w-auto"
                  >
                    {isCreatingOrders ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    Créer toutes les commandes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Détail par fournisseur */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Détail par fournisseur</h3>
              
              {Object.entries(groupedOrders).map(([fournisseurId, orderData]) => (
                <Card key={fournisseurId}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{orderData.fournisseur.nom}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {orderData.items.length} article(s) • {orderData.total_ttc.toFixed(2)} € TTC
                      </div>
                    </div>
                    <Button
                      onClick={() => createOrderForSupplier(fournisseurId)}
                      disabled={isCreatingOrders}
                      size="sm"
                    >
                      {isCreatingOrders ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      Commander
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderData.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.designation}</div>
                            <div className="text-xs text-muted-foreground">
                              Réf: {item.reference} • Qté: {item.quantite_commandee} • {item.prix_unitaire.toFixed(2)} €/u
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {item.total_ligne.toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Total HT:</span>
                      <span className="font-medium">{orderData.total_ht.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>TVA (20%):</span>
                      <span className="font-medium">{(orderData.total_ttc - orderData.total_ht).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total TTC:</span>
                      <span>{orderData.total_ttc.toFixed(2)} €</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};