import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, AlertTriangle, CheckCircle, ShoppingCart, Package, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import type { Tables } from "@/integrations/supabase/types";

type Vehicule = Tables<"vehicules">;
type Article = Tables<"articles">;

interface VehiculeGroup {
  marque: string;
  modele: string;
  motorisation: string | null;
  count: number;
  vehicules: Vehicule[];
}

interface CompatibleArticle extends Article {
  compatible_vehicules: {
    notes: string | null;
  }[];
}

export default function Revisions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<VehiculeGroup | null>(null);
  const [quantiteRevision, setQuantiteRevision] = useState<number | "">(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [showSortieDialog, setShowSortieDialog] = useState(false);
  const [articleQuantities, setArticleQuantities] = useState<Record<string, number>>({});
  const [useNonRegisteredVehicle, setUseNonRegisteredVehicle] = useState(false);
  const [nonRegisteredVehicle, setNonRegisteredVehicle] = useState({
    marque: "",
    modele: "",
    motorisation: "",
  });

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-actifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("marque", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articlesCompatibles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["articles-compatibles", selectedGroup, useNonRegisteredVehicle],
    queryFn: async () => {
      // Si on utilise un véhicule non enregistré, on retourne tous les articles
      if (useNonRegisteredVehicle) {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .order("designation", { ascending: true });
        
        if (error) throw error;
        return data;
      }
      
      if (!selectedGroup || selectedGroup.vehicules.length === 0) return [];
      
      const vehiculeIds = selectedGroup.vehicules.map(v => v.id);
      
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          article_vehicules!inner (
            notes,
            vehicule_id
          )
        `)
        .in("article_vehicules.vehicule_id", vehiculeIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGroup || useNonRegisteredVehicle,
  });

  // Grouper les véhicules par marque/modèle/motorisation
  const vehiculeGroups: VehiculeGroup[] = vehicules.reduce((groups: VehiculeGroup[], vehicule) => {
    const existingGroup = groups.find(
      g => g.marque === vehicule.marque && 
           g.modele === vehicule.modele && 
           g.motorisation === vehicule.motorisation
    );

    if (existingGroup) {
      existingGroup.count++;
      existingGroup.vehicules.push(vehicule);
    } else {
      groups.push({
        marque: vehicule.marque,
        modele: vehicule.modele,
        motorisation: vehicule.motorisation,
        count: 1,
        vehicules: [vehicule]
      });
    }

    return groups;
  }, []);

  const analyseStock = (article: Article, quantiteNecessaire: number) => {
    const stockDisponible = article.stock;
    const stockManquant = Math.max(0, quantiteNecessaire - stockDisponible);
    
    return {
      disponible: stockDisponible,
      necessaire: quantiteNecessaire,
      manquant: stockManquant,
      suffisant: stockDisponible >= quantiteNecessaire
    };
  };

  const handleRevisionAnalysis = (group: VehiculeGroup) => {
    setUseNonRegisteredVehicle(false);
    setSelectedGroup(group);
    setIsAnalyzing(true);
    setSelectedArticles(new Set());
    setArticleQuantities({});
  };

  const handleNonRegisteredVehicleRevision = () => {
    if (!nonRegisteredVehicle.marque || !nonRegisteredVehicle.modele) {
      toast.error("Veuillez renseigner au moins la marque et le modèle");
      return;
    }
    
    setUseNonRegisteredVehicle(true);
    setSelectedGroup({
      marque: nonRegisteredVehicle.marque,
      modele: nonRegisteredVehicle.modele,
      motorisation: nonRegisteredVehicle.motorisation || null,
      count: 1,
      vehicules: []
    });
    setIsAnalyzing(true);
    setSelectedArticles(new Set());
    setArticleQuantities({});
  };

  const generateCommande = async () => {
    if (!selectedGroup || !articlesCompatibles.length) return;

    const piecesACommander = articlesCompatibles
      .map(article => {
        const analyse = analyseStock(article, typeof quantiteRevision === "number" ? quantiteRevision : 1);
        return { article, analyse };
      })
      .filter(({ analyse }) => analyse.manquant > 0);

    if (piecesACommander.length === 0) {
      toast.info("Toutes les pièces sont disponibles en stock");
      return;
    }

    try {
      // Récupérer les associations article-fournisseur pour les pièces à commander
      const articleIds = piecesACommander.map(({ article }) => article.id);
      const { data: afList, error: afError } = await supabase
        .from('article_fournisseurs')
        .select('article_id, fournisseur_id, prix_fournisseur, est_principal, actif')
        .in('article_id', articleIds)
        .eq('actif', true);

      if (afError) throw afError;

      // Récupérer tous les fournisseur_id depuis les articles et article_fournisseurs
      const fournisseurIdsSet = new Set<string>();
      
      // Ajouter les fournisseurs depuis article_fournisseurs
      if (afList) {
        afList.forEach(af => fournisseurIdsSet.add(af.fournisseur_id));
      }
      
      // Ajouter les fournisseurs depuis les articles
      piecesACommander.forEach(({ article }) => {
        if (article.fournisseur_id) {
          fournisseurIdsSet.add(article.fournisseur_id);
        }
      });

      if (fournisseurIdsSet.size === 0) {
        toast.error("Aucun fournisseur trouvé pour ces articles");
        return;
      }

      const fournisseurIds = Array.from(fournisseurIdsSet);
      const { data: fournisseurs, error: fError } = await supabase
        .from('fournisseurs')
        .select('id, nom, email, telephone, adresse, actif')
        .in('id', fournisseurIds)
        .eq('actif', true);

      if (fError) throw fError;

      const fournisseursMap = new Map((fournisseurs || []).map(f => [f.id, f]));

      // Grouper par fournisseur
      const grouped: Record<string, any> = {};
      
      for (const { article, analyse } of piecesACommander) {
        // Trouver le meilleur fournisseur pour cet article
        const articleFournisseurs = afList?.filter(af => af.article_id === article.id) || [];
        let bestFournisseur = articleFournisseurs.find(af => af.est_principal);
        if (!bestFournisseur && articleFournisseurs.length > 0) {
          bestFournisseur = articleFournisseurs[0];
        }

        let fournisseur;
        let prixFournisseur;

        if (bestFournisseur) {
          fournisseur = fournisseursMap.get(bestFournisseur.fournisseur_id);
          prixFournisseur = bestFournisseur.prix_fournisseur;
        } else if (article.fournisseur_id) {
          // Utiliser le fournisseur de l'article si pas d'association dans article_fournisseurs
          fournisseur = fournisseursMap.get(article.fournisseur_id);
          prixFournisseur = null;
        }

        if (!fournisseur) continue;

        const fournisseurId = fournisseur.id;
        if (!grouped[fournisseurId]) {
          grouped[fournisseurId] = {
            fournisseur,
            items: [],
            total_ht: 0,
            total_ttc: 0
          };
        }

        const prixUnitaire = prixFournisseur || article.prix_achat || 0;
        const totalLigne = analyse.manquant * prixUnitaire;

        grouped[fournisseurId].items.push({
          article_id: article.id,
          designation: article.designation,
          reference: article.reference,
          quantite_commandee: analyse.manquant,
          prix_unitaire: prixUnitaire,
          total_ligne: totalLigne
        });

        grouped[fournisseurId].total_ht += totalLigne;
        grouped[fournisseurId].total_ttc = grouped[fournisseurId].total_ht * 1.20;
      }

      if (Object.keys(grouped).length === 0) {
        toast.error("Impossible de grouper les articles par fournisseur");
        return;
      }

      // Créer les commandes et collecter leurs IDs
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const createdCommandeIds: string[] = [];
      
      for (const [fournisseurId, orderData] of Object.entries(grouped)) {
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
            user_id: currentUser?.id,
            numero_commande: ''
          }])
          .select()
          .single();

        if (commandeError) throw commandeError;

        // Collecter l'ID de la commande créée
        createdCommandeIds.push(commande.id);

        // Créer les items de commande
        const itemsToInsert = orderData.items.map((item: any) => ({
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

      toast.success(`${Object.keys(grouped).length} commande(s) créée(s) pour ${piecesACommander.length} pièces`);
      
      // Rediriger vers les commandes avec les IDs créés
      setTimeout(() => {
        navigate('/commandes', { 
          state: { openCommandeIds: createdCommandeIds },
          replace: true 
        });
      }, 300);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleArticleSelection = (articleId: string, checked: boolean) => {
    const newSelected = new Set(selectedArticles);
    if (checked) {
      newSelected.add(articleId);
      // Initialiser la quantité à 1 par défaut
      setArticleQuantities(prev => ({
        ...prev,
        [articleId]: prev[articleId] || 1
      }));
    } else {
      newSelected.delete(articleId);
      setArticleQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[articleId];
        return newQuantities;
      });
    }
    setSelectedArticles(newSelected);
  };

  const handleQuantityChange = (articleId: string, quantity: number) => {
    setArticleQuantities(prev => ({
      ...prev,
      [articleId]: quantity
    }));
  };

  const handleSortieStock = () => {
    if (selectedArticles.size === 0) {
      toast.error("Veuillez sélectionner au moins un article");
      return;
    }
    setShowSortieDialog(true);
  };

  const sortieStockMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Utilisateur non connecté");

      // Vérifier le stock disponible pour chaque article AVANT la sortie
      const articlesAvecStock = [];
      for (const articleId of selectedArticles) {
        const article = articlesCompatibles.find(a => a.id === articleId);
        const quantity = articleQuantities[articleId] || 1;
        
        if (!article) {
          throw new Error(`Article non trouvé: ${articleId}`);
        }
        
        if (article.stock <= 0) {
          throw new Error(`L'article "${article.designation}" est en rupture de stock`);
        }
        
        if (article.stock < quantity) {
          throw new Error(`Stock insuffisant pour "${article.designation}". Stock disponible: ${article.stock}, demandé: ${quantity}`);
        }
        
        articlesAvecStock.push({ articleId, article, quantity });
      }

      const mouvements = articlesAvecStock.map(({ articleId, quantity }) => ({
        article_id: articleId,
        type: 'sortie',
        motif: 'révision',
        quantity: -quantity, // Négatif pour une sortie
        user_id: user.id,
        vehicule_id: selectedGroup?.vehicules[0]?.id || null
      }));

      // Créer les mouvements de stock
      const { error } = await supabase
        .from('stock_movements')
        .insert(mouvements);

      if (error) throw error;

      // Mettre à jour le stock des articles
      for (const { articleId, quantity } of articlesAvecStock) {
        await supabase.rpc('update_article_stock', {
          article_id: articleId,
          quantity_change: -quantity
        });
      }
    },
    onSuccess: () => {
      toast.success("Sortie de stock effectuée avec succès");
      queryClient.invalidateQueries({ queryKey: ["articles-compatibles"] });
      setShowSortieDialog(false);
      setSelectedArticles(new Set());
      setArticleQuantities({});
    },
    onError: (error) => {
      toast.error(`Erreur lors de la sortie de stock: ${error.message}`);
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Révisions Programmées</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sélection des véhicules */}
          <Card>
            <CardHeader>
              <CardTitle>Véhicules par Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehiculeGroups.map((group, index) => (
                  <button 
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer w-full text-left transition-colors"
                    onClick={() => handleRevisionAnalysis(group)}
                  >
                    <div>
                      <div className="font-medium">
                        {group.marque} {group.modele}
                        {group.motorisation && ` (${group.motorisation})`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {group.count} véhicule{group.count > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {group.count}
                    </Badge>
                  </button>
                ))}
                
                {vehiculeGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun véhicule actif enregistré
                  </div>
                )}

                {/* Section pour véhicule non enregistré */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Véhicule non enregistré</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="marque-temp">Marque *</Label>
                      <Input
                        id="marque-temp"
                        value={nonRegisteredVehicle.marque}
                        onChange={(e) => setNonRegisteredVehicle(prev => ({ ...prev, marque: e.target.value }))}
                        placeholder="Peugeot, Renault..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="modele-temp">Modèle *</Label>
                      <Input
                        id="modele-temp"
                        value={nonRegisteredVehicle.modele}
                        onChange={(e) => setNonRegisteredVehicle(prev => ({ ...prev, modele: e.target.value }))}
                        placeholder="208, Clio..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="motorisation-temp">Motorisation</Label>
                      <Input
                        id="motorisation-temp"
                        value={nonRegisteredVehicle.motorisation}
                        onChange={(e) => setNonRegisteredVehicle(prev => ({ ...prev, motorisation: e.target.value }))}
                        placeholder="Essence, Diesel..."
                      />
                    </div>
                    <Button 
                      onClick={handleNonRegisteredVehicleRevision}
                      className="w-full"
                      variant="outline"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Analyser ce véhicule
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analyse des pièces */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Pièces</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedGroup ? (
                <div className="text-center py-8 text-muted-foreground">
                  Sélectionnez un type de véhicule pour analyser les pièces nécessaires
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h3 className="font-medium">
                      {selectedGroup.marque} {selectedGroup.modele}
                      {selectedGroup.motorisation && ` (${selectedGroup.motorisation})`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.count} véhicule{selectedGroup.count > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="quantite">Quantité de véhicules à réviser</Label>
                    <Input
                      id="quantite"
                      type="number"
                      min="1"
                      max={selectedGroup.count}
                      value={quantiteRevision}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setQuantiteRevision("");
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num) && num >= 1) {
                            setQuantiteRevision(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "" || parseInt(e.target.value) < 1) {
                          setQuantiteRevision(1);
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  {loadingArticles ? (
                    <div className="text-center py-4">Chargement des pièces...</div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-medium">
                        Pièces compatibles ({articlesCompatibles.length})
                      </h4>
                      
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {articlesCompatibles.map((article) => {
                          const analyse = analyseStock(article, typeof quantiteRevision === "number" ? quantiteRevision : 1);
                          const isSelected = selectedArticles.has(article.id);
                          return (
                            <div key={article.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleArticleSelection(article.id, checked as boolean)
                                  }
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{article.designation}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {article.reference} - {article.marque} - {article.categorie}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2 mr-2">
                                  <Label className="text-xs">Qté:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={article.stock}
                                    value={articleQuantities[article.id] || 1}
                                    onChange={(e) => handleQuantityChange(article.id, parseInt(e.target.value) || 1)}
                                    className="w-16 h-6 text-xs"
                                  />
                                </div>
                              )}
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  {analyse.suffisant ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  )}
                                  <div className="text-sm">
                                    <div>{analyse.disponible}/{analyse.necessaire}</div>
                                    {analyse.manquant > 0 && (
                                      <div className="text-xs text-orange-600">
                                        Manque: {analyse.manquant}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {articlesCompatibles.length > 0 && (
                        <div className="pt-4 space-y-2">
                          <Button 
                            onClick={handleSortieStock}
                            className="w-full"
                            variant="outline"
                            disabled={selectedArticles.size === 0}
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Sortir du Stock ({selectedArticles.size} sélectionné{selectedArticles.size > 1 ? 's' : ''})
                          </Button>
                          <Button 
                            onClick={generateCommande}
                            className="w-full"
                            variant="default"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Générer la Commande Nécessaire
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Résumé de l'analyse */}
        {selectedGroup && articlesCompatibles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résumé de l'Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {articlesCompatibles.filter(a => analyseStock(a, typeof quantiteRevision === "number" ? quantiteRevision : 1).suffisant).length}
                  </div>
                  <div className="text-sm text-green-700">Pièces disponibles</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-600">
                    {articlesCompatibles.filter(a => !analyseStock(a, typeof quantiteRevision === "number" ? quantiteRevision : 1).suffisant).length}
                  </div>
                  <div className="text-sm text-orange-700">Pièces à commander</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">
                    {typeof quantiteRevision === "number" ? quantiteRevision : 1}
                  </div>
                  <div className="text-sm text-blue-700">Véhicules à réviser</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de confirmation pour la sortie de stock */}
        <Dialog open={showSortieDialog} onOpenChange={setShowSortieDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Confirmer la Sortie de Stock - Révision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">
                  {selectedGroup?.marque} {selectedGroup?.modele}
                  {selectedGroup?.motorisation && ` (${selectedGroup.motorisation})`}
                </h3>
                <p className="text-sm text-blue-700">
                  Motif: Révision - {selectedArticles.size} article{selectedArticles.size > 1 ? 's' : ''} sélectionné{selectedArticles.size > 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Articles à sortir du stock:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {Array.from(selectedArticles).map(articleId => {
                    const article = articlesCompatibles.find(a => a.id === articleId);
                    const quantity = articleQuantities[articleId] || 1;
                    if (!article) return null;
                    
                    return (
                      <div key={articleId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{article.designation}</div>
                          <div className="text-xs text-muted-foreground">
                            {article.reference} - {article.marque} - {article.categorie}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            Quantité: {quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stock actuel: {article.stock}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSortieDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={() => sortieStockMutation.mutate()}
                  disabled={sortieStockMutation.isPending}
                  className="flex-1"
                >
                  {sortieStockMutation.isPending ? "Traitement..." : "Confirmer la Sortie"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}