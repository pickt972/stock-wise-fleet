import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ShoppingCart, Mail, Download, Edit, Brain } from "lucide-react";
import { PurchaseOrderDialog } from "@/components/commandes/PurchaseOrderDialog";
import { SmartOrderDialog } from "@/components/commandes/SmartOrderDialog";
import DashboardLayout from "./DashboardLayout";

interface Article {
  id: string;
  designation: string;
  reference: string;
  prix_achat: number;
}

interface CommandeItem {
  id?: string;
  article_id?: string;
  designation: string;
  reference?: string;
  quantite_commandee: number;
  prix_unitaire: number;
  total_ligne: number;
}

interface Commande {
  id?: string;
  numero_commande?: string;
  fournisseur: string;
  email_fournisseur?: string;
  telephone_fournisseur?: string;
  adresse_fournisseur?: string;
  notes?: string;
  status: 'brouillon' | 'envoye' | 'confirme' | 'recu_partiel' | 'recu_complet' | 'annule';
  date_creation?: string;
  total_ht: number;
  total_ttc: number;
  tva_taux: number;
  user_id?: string;
}

interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  actif: boolean;
}

export default function Commandes() {
  const location = useLocation();
  const [commandes, setCommandes] = useState<(Commande & { items: CommandeItem[] })[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCommande, setEditingCommande] = useState<(Commande & { items: CommandeItem[] }) | null>(null);
  const [showSmartOrder, setShowSmartOrder] = useState(false);
  const [currentCommande, setCurrentCommande] = useState<Commande>({
    fournisseur: "",
    email_fournisseur: "",
    telephone_fournisseur: "",
    adresse_fournisseur: "",
    notes: "",
    status: "brouillon",
    total_ht: 0,
    total_ttc: 0,
    tva_taux: 20,
    user_id: undefined,
  });
  const [currentItems, setCurrentItems] = useState<CommandeItem[]>([]);
  const [purchaseOrderDialog, setPurchaseOrderDialog] = useState<{
    isOpen: boolean;
    commande?: Commande & { items: CommandeItem[] };
  }>({ isOpen: false });
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCommandes(), fetchArticles(), fetchFournisseurs()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Gérer les articles pré-remplis depuis les alertes
  useEffect(() => {
    if (location.state?.prefilledItems) {
      const { prefilledItems, source } = location.state;
      setCurrentItems(prefilledItems.map((item: any) => ({
        ...item,
        total_ligne: item.quantite_commandee * item.prix_unitaire
      })));
      
      const { totalHT, totalTTC } = calculateTotals(prefilledItems, currentCommande.tva_taux);
      setCurrentCommande(prev => ({
        ...prev,
        total_ht: totalHT,
        total_ttc: totalTTC
      }));
      
      setIsCreating(true);
      
      // Message d'information
      toast({
        title: source === 'alerts' ? "Articles d'alerte ajoutés" : "Article d'alerte ajouté",
        description: `${prefilledItems.length} article(s) ajouté(s) à la commande depuis les alertes`,
      });
    }
  }, [location.state]);

  const fetchCommandes = async () => {
    try {
      const { data: commandesData, error: commandesError } = await supabase
        .from('commandes')
        .select('*')
        .order('created_at', { ascending: false });

      if (commandesError) throw commandesError;

      if (commandesData && commandesData.length > 0) {
        // Récupérer les items pour chaque commande
        const commandesWithItems = await Promise.all(
          commandesData.map(async (commande) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('commande_items')
              .select('*')
              .eq('commande_id', commande.id);

            if (itemsError) {
              console.error('Error fetching items:', itemsError);
              return { ...commande, items: [] };
            }

            return {
              ...commande,
              items: itemsData || []
            };
          })
        );

        setCommandes(commandesWithItems);
      } else {
        setCommandes([]);
      }
    } catch (error: any) {
      console.error('Error in fetchCommandes:', error);
      setCommandes([]);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, designation, reference, prix_achat')
        .order('designation');

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('id, nom, email, telephone, adresse, actif')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateTotals = (items: CommandeItem[], tvaTaux: number) => {
    const totalHT = items.reduce((sum, item) => sum + item.total_ligne, 0);
    const totalTTC = totalHT * (1 + tvaTaux / 100);
    return { totalHT, totalTTC };
  };

  const addItem = () => {
    setCurrentItems([
      ...currentItems,
      {
        designation: "",
        reference: "",
        quantite_commandee: 1,
        prix_unitaire: 0,
        total_ligne: 0,
      }
    ]);
  };

  const updateItem = (index: number, field: keyof CommandeItem, value: any) => {
    const newItems = [...currentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculer le total de la ligne
    if (field === 'quantite_commandee' || field === 'prix_unitaire') {
      newItems[index].total_ligne = newItems[index].quantite_commandee * newItems[index].prix_unitaire;
    }
    
    setCurrentItems(newItems);
    
    // Recalculer les totaux de la commande
    const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
    setCurrentCommande(prev => ({
      ...prev,
      total_ht: totalHT,
      total_ttc: totalTTC
    }));
  };

  const removeItem = (index: number) => {
    const newItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(newItems);
    
    const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
    setCurrentCommande(prev => ({
      ...prev,
      total_ht: totalHT,
      total_ttc: totalTTC
    }));
  };

  const selectArticle = (index: number, articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (article) {
      updateItem(index, 'article_id', articleId);
      updateItem(index, 'designation', article.designation);
      updateItem(index, 'reference', article.reference);
      updateItem(index, 'prix_unitaire', article.prix_achat);
    }
  };

  const saveCommande = async () => {
    if (!currentCommande.fournisseur || currentItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner le fournisseur et ajouter au moins un article",
        variant: "destructive",
      });
      return;
    }

    try {
      let commandeId: string;

      if (editingCommande) {
        // Modifier une commande existante
        const { error: commandeError } = await supabase
          .from('commandes')
          .update(currentCommande)
          .eq('id', editingCommande.id);

        if (commandeError) throw commandeError;
        commandeId = editingCommande.id!;

        // Supprimer les anciens items
        await supabase
          .from('commande_items')
          .delete()
          .eq('commande_id', commandeId);
      } else {
        // Créer une nouvelle commande
        const { data: { user } } = await supabase.auth.getUser();
        const { data: commandeData, error: commandeError } = await supabase
          .from('commandes')
          .insert([{ 
            ...currentCommande, 
            user_id: user?.id,
            numero_commande: '' // Le trigger va générer le numéro automatiquement
          }])
          .select()
          .single();

        if (commandeError) throw commandeError;
        commandeId = commandeData.id;
      }

      // Insérer les nouveaux items
      const itemsToInsert = currentItems.map(item => ({
        ...item,
        commande_id: commandeId
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Succès",
        description: editingCommande ? "Commande modifiée" : "Commande créée",
      });

      // Reset
      setIsCreating(false);
      setEditingCommande(null);
      setCurrentCommande({
        fournisseur: "",
        email_fournisseur: "",
        telephone_fournisseur: "",
        adresse_fournisseur: "",
        notes: "",
        status: "brouillon",
        total_ht: 0,
        total_ttc: 0,
        tva_taux: 20,
        user_id: undefined,
      });
      setCurrentItems([]);
      fetchCommandes();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editCommande = (commande: Commande & { items: CommandeItem[] }) => {
    setEditingCommande(commande);
    setCurrentCommande(commande);
    setCurrentItems(commande.items);
    setIsCreating(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'brouillon': return 'default';
      case 'envoyee': return 'secondary';
      case 'recue': return 'success';
      case 'annulee': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'brouillon': return 'Brouillon';
      case 'envoye': return 'Envoyée';
      case 'confirme': return 'Confirmée';
      case 'recu_partiel': return 'Reçue partiellement';
      case 'recu_complet': return 'Reçue complètement';
      case 'annule': return 'Annulée';
      default: return status;
    }
  };

  if (isCreating) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {editingCommande ? 'Modifier la commande' : 'Nouvelle commande'}
            </h1>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              setEditingCommande(null);
              setCurrentCommande({
                fournisseur: "",
                email_fournisseur: "",
                telephone_fournisseur: "",
                adresse_fournisseur: "",
                notes: "",
                status: "brouillon",
                total_ht: 0,
                total_ttc: 0,
                tva_taux: 20,
                user_id: undefined,
              });
              setCurrentItems([]);
            }}>
              Annuler
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations fournisseur */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Informations fournisseur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fournisseur">Fournisseur *</Label>
                    <Select
                      value={currentCommande.fournisseur}
                      onValueChange={(value) => {
                        const selectedFournisseur = fournisseurs.find(f => f.nom === value);
                        if (selectedFournisseur) {
                          setCurrentCommande(prev => ({
                            ...prev,
                            fournisseur: selectedFournisseur.nom,
                            email_fournisseur: selectedFournisseur.email || "",
                            telephone_fournisseur: selectedFournisseur.telephone || "",
                            adresse_fournisseur: selectedFournisseur.adresse || ""
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {fournisseurs.map((fournisseur) => (
                          <SelectItem key={fournisseur.id} value={fournisseur.nom}>
                            {fournisseur.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="mt-2"
                      placeholder="Ou saisir manuellement"
                      value={currentCommande.fournisseur}
                      onChange={(e) => setCurrentCommande(prev => ({ ...prev, fournisseur: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentCommande.email_fournisseur || ""}
                      onChange={(e) => setCurrentCommande(prev => ({ ...prev, email_fournisseur: e.target.value }))}
                      placeholder="email@fournisseur.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={currentCommande.telephone_fournisseur || ""}
                      onChange={(e) => setCurrentCommande(prev => ({ ...prev, telephone_fournisseur: e.target.value }))}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={currentCommande.status}
                      onValueChange={(value: any) => setCurrentCommande(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="brouillon">Brouillon</SelectItem>
                        <SelectItem value="envoye">Envoyée</SelectItem>
                        <SelectItem value="confirme">Confirmée</SelectItem>
                        <SelectItem value="recu_partiel">Reçue partiellement</SelectItem>
                        <SelectItem value="recu_complet">Reçue complètement</SelectItem>
                        <SelectItem value="annule">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Textarea
                    id="adresse"
                    value={currentCommande.adresse_fournisseur || ""}
                    onChange={(e) => setCurrentCommande(prev => ({ ...prev, adresse_fournisseur: e.target.value }))}
                    placeholder="Adresse complète du fournisseur"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={currentCommande.notes || ""}
                    onChange={(e) => setCurrentCommande(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes et commentaires"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Résumé */}
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tva">Taux TVA (%)</Label>
                  <Input
                    id="tva"
                    type="number"
                    value={currentCommande.tva_taux}
                    onChange={(e) => {
                      const newTva = parseFloat(e.target.value) || 0;
                      const { totalHT, totalTTC } = calculateTotals(currentItems, newTva);
                      setCurrentCommande(prev => ({
                        ...prev,
                        tva_taux: newTva,
                        total_ht: totalHT,
                        total_ttc: totalTTC
                      }));
                    }}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total HT:</span>
                    <span className="font-medium">{currentCommande.total_ht.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA ({currentCommande.tva_taux}%):</span>
                    <span className="font-medium">{(currentCommande.total_ttc - currentCommande.total_ht).toFixed(2)} €</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total TTC:</span>
                    <span>{currentCommande.total_ttc.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Articles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Articles</CardTitle>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-2">
                      <Label>Article</Label>
                      <Select onValueChange={(value) => selectArticle(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un article" />
                        </SelectTrigger>
                        <SelectContent>
                          {articles.map((article) => (
                            <SelectItem key={article.id} value={article.id}>
                              {article.designation} - {article.reference}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="mt-2"
                        placeholder="Ou saisir manuellement"
                        value={item.designation}
                        onChange={(e) => updateItem(index, 'designation', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Référence</Label>
                      <Input
                        value={item.reference || ""}
                        onChange={(e) => updateItem(index, 'reference', e.target.value)}
                        placeholder="REF-001"
                      />
                    </div>
                    <div>
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        value={item.quantite_commandee}
                        onChange={(e) => updateItem(index, 'quantite_commandee', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Prix unitaire</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.prix_unitaire}
                        onChange={(e) => updateItem(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <Label>Total</Label>
                        <div className="font-medium">{item.total_ligne.toFixed(2)} €</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {currentItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              setEditingCommande(null);
              setCurrentCommande({
                fournisseur: "",
                email_fournisseur: "",
                telephone_fournisseur: "",
                adresse_fournisseur: "",
                notes: "",
                status: "brouillon",
                total_ht: 0,
                total_ttc: 0,
                tva_taux: 20,
                user_id: undefined,
              });
              setCurrentItems([]);
            }}>
              Annuler
            </Button>
            <Button onClick={saveCommande}>
              {editingCommande ? 'Modifier' : 'Créer'} la commande
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Commandes</h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowSmartOrder(true)} variant="outline">
                <Brain className="w-4 h-4 mr-2" />
                Commande intelligente
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle commande
              </Button>
            </div>
          </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Chargement des commandes...</div>
          </div>
        ) : (

        <div className="grid gap-6">
          {commandes.length > 0 ? commandes.map((commande) => (
            <Card key={commande.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {commande?.numero_commande || 'N/A'}
                      <Badge variant={getStatusColor(commande?.status || 'brouillon') as any}>
                        {getStatusLabel(commande?.status || 'brouillon')}
                      </Badge>
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {commande?.fournisseur || 'Fournisseur non renseigné'} • {commande?.items?.length || 0} article(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editCommande(commande)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPurchaseOrderDialog({
                        isOpen: true,
                        commande: commande
                      })}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Bon de commande
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Informations</h4>
                    <p className="text-sm">Email: {commande?.email_fournisseur || "Non renseigné"}</p>
                    <p className="text-sm">Tél: {commande?.telephone_fournisseur || "Non renseigné"}</p>
                    <p className="text-sm">Date: {commande?.date_creation ? new Date(commande.date_creation).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Totaux</h4>
                    <p className="text-sm">Total HT: {(commande?.total_ht || 0).toFixed(2)} €</p>
                    <p className="text-sm">TVA: {((commande?.total_ttc || 0) - (commande?.total_ht || 0)).toFixed(2)} €</p>
                    <p className="font-medium">Total TTC: {(commande?.total_ttc || 0).toFixed(2)} €</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Articles</h4>
                    {(commande?.items || []).slice(0, 3).map((item, idx) => (
                      <p key={idx} className="text-sm truncate">
                        {item?.designation || 'Article sans nom'} × {item?.quantite_commandee || 0}
                      </p>
                    ))}
                    {(commande?.items?.length || 0) > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{(commande?.items?.length || 0) - 3} autre(s)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre première commande pour commencer
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle commande
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        )}
      </div>

      {/* Smart Order Dialog */}
      <SmartOrderDialog
        isOpen={showSmartOrder}
        onClose={() => setShowSmartOrder(false)}
        onOrdersCreated={fetchCommandes}
      />

      {/* Purchase Order Dialog */}
      <PurchaseOrderDialog
        isOpen={purchaseOrderDialog.isOpen}
        onClose={() => setPurchaseOrderDialog({ isOpen: false })}
        commande={purchaseOrderDialog.commande as any}
        items={purchaseOrderDialog.commande?.items || []}
      />
    </DashboardLayout>
  );
}