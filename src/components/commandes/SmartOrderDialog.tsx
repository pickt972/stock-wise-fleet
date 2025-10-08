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
      // 1) Récupérer tous les articles puis filtrer ceux en alerte côté client
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, designation, reference, stock, stock_min, prix_achat');

      if (articlesError) throw articlesError;

      const lowStockArticles = (articles || []).filter(
        (a: any) => a && (a.stock === 0 || a.stock <= a.stock_min)
      );

      if (lowStockArticles.length === 0) {
        setGroupedOrders({});
        return;
      }

      // 2) Charger les associations article_fournisseurs pour ces articles
      const articleIds = lowStockArticles.map((a: any) => a.id);
      const { data: afList, error: afError } = await supabase
        .from('article_fournisseurs')
        .select('article_id, fournisseur_id, prix_fournisseur, est_principal, actif, quantite_minimum')
        .in('article_id', articleIds)
        .eq('actif', true);

      if (afError) throw afError;

      if (!afList || afList.length === 0) {
        setGroupedOrders({});
        return;
      }

      // 3) Charger les fournisseurs actifs référencés
      const fournisseurIds = Array.from(new Set(afList.map((af: any) => af.fournisseur_id)));
      const { data: fournisseurs, error: fError } = await supabase
        .from('fournisseurs')
        .select('id, nom, email, telephone, adresse, actif')
        .in('id', fournisseurIds)
        .eq('actif', true);

      if (fError) throw fError;

      // Maps pour accès rapide
      const fournisseursMap = new Map((fournisseurs || []).map((f: any) => [f.id, f]));
      const articlesMap = new Map(lowStockArticles.map((a: any) => [a.id, a]));

      // 4) Choisir pour chaque article le fournisseur principal si dispo, sinon le premier
      const bestAssociationByArticle = new Map<string, any>();
      for (const af of afList) {
        const current = bestAssociationByArticle.get(af.article_id);
        if (!current) {
          bestAssociationByArticle.set(af.article_id, af);
        } else if (!current.est_principal && af.est_principal) {
          bestAssociationByArticle.set(af.article_id, af);
        }
      }

      // 5) Construire les commandes groupées par fournisseur
      const grouped: GroupedBySupplier = {};

      for (const [articleId, af] of bestAssociationByArticle.entries()) {
        const article: any = articlesMap.get(articleId);
        const fournisseur: any = fournisseursMap.get(af.fournisseur_id);
        if (!article || !fournisseur) continue; // sécurité

        // Utiliser la quantité minimum définie dans article_fournisseurs ou calculer une quantité par défaut
        const quantiteMinimum = af.quantite_minimum || 1;
        const quantiteACommander = article.stock === 0
          ? Math.max(quantiteMinimum, article.stock_min || 1)
          : Math.max(quantiteMinimum, (article.stock_min || 1) - article.stock);

        const prixUnitaire = af.prix_fournisseur ?? article.prix_achat ?? 0;

        const item: SmartOrderItem = {
          article_id: article.id,
          designation: article.designation,
          reference: article.reference,
          quantite_commandee: quantiteACommander,
          prix_unitaire: prixUnitaire,
          total_ligne: quantiteACommander * prixUnitaire,
          fournisseur,
        };

        const fid = fournisseur.id;
        if (!grouped[fid]) {
          grouped[fid] = {
            fournisseur,
            items: [],
            total_ht: 0,
            total_ttc: 0,
          };
        }

        grouped[fid].items.push(item);
        grouped[fid].total_ht += item.total_ligne;
        grouped[fid].total_ttc = grouped[fid].total_ht * 1.2; // TVA 20%
      }

      setGroupedOrders(grouped);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
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
      const createdCommandeIds: string[] = [];
      
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

        // Collecter l'ID
        createdCommandeIds.push(commande.id);

        // Créer les items de commande
        const itemsToInsert = orderData.items.map(item => ({
          commande_id: commande.id,
          article_id: item.article_id,
          designation: item.designation,
          reference: item.reference,
          quantite_commandee: item.quantite_commandee,
          quantite_recue: 0,
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
      
      // Ouvrir la première commande créée
      if (createdCommandeIds.length > 0) {
        setTimeout(() => {
          window.location.hash = `#commande-${createdCommandeIds[0]}`;
        }, 500);
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
        quantite_recue: 0,
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