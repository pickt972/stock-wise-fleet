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
import { Plus, Trash2, ShoppingCart, Mail, Download, Edit, Brain, Search, Check, ScanBarcode, PackageCheck } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { PurchaseOrderDialog } from "@/components/commandes/PurchaseOrderDialog";
import { SmartOrderDialog } from "@/components/commandes/SmartOrderDialog";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { ReceptionCommandeDialog } from "@/components/commandes/ReceptionCommandeDialog";
import { useRoleAccess } from "@/hooks/useRoleAccess";
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
import DashboardLayout from "./DashboardLayout";

interface Article {
  id: string;
  designation: string;
  reference: string;
  prix_achat: number;
  fournisseur_id?: string;
  code_barre?: string;
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
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCommande, setEditingCommande] = useState<(Commande & { items: CommandeItem[] }) | null>(null);
  const [showSmartOrder, setShowSmartOrder] = useState(false);
  const [articleSearchOpen, setArticleSearchOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [currentCommande, setCurrentCommande] = useState<Commande>({
    fournisseur: "",
    email_fournisseur: "",
    telephone_fournisseur: "",
    adresse_fournisseur: "",
    notes: "",
    status: "brouillon",
    total_ht: 0,
    total_ttc: 0,
    tva_taux: 8.5,
    user_id: undefined,
  });
  const [currentItems, setCurrentItems] = useState<CommandeItem[]>([]);
  const [showCreateArticleDialog, setShowCreateArticleDialog] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState<Record<number, string>>({});
  const [purchaseOrderDialog, setPurchaseOrderDialog] = useState<{
    isOpen: boolean;
    commande?: Commande & { items: CommandeItem[] };
  }>({ isOpen: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    commande?: Commande & { items: CommandeItem[] };
  }>({ isOpen: false });
  const [receptionDialog, setReceptionDialog] = useState<{
    isOpen: boolean;
    commande?: Commande & { items: CommandeItem[] };
  }>({ isOpen: false });
  const [currentFournisseurId, setCurrentFournisseurId] = useState<string>("");
  const { toast } = useToast();
  const { isAdmin } = useRoleAccess();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCommandes(), fetchArticles(), fetchFournisseurs()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Gérer les articles pré-remplis depuis les alertes et inventaire
  useEffect(() => {
    const handlePrefilledItems = async () => {
      if (location.state?.prefilledItems) {
        const { prefilledItems, source, fournisseurNom, fournisseur, forceNewOrder } = location.state;
        const fournisseurName = fournisseurNom || fournisseur;
        
        // Vérifier s'il existe une commande en brouillon pour ce fournisseur (sauf si forceNewOrder)
        if (fournisseurName && !forceNewOrder) {
          const { data: existingDrafts } = await supabase
            .from('commandes')
            .select('*, commande_items(*)')
            .eq('fournisseur', fournisseurName)
            .eq('status', 'brouillon')
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingDrafts && existingDrafts.length > 0) {
            const existingCommande = existingDrafts[0];
            
            // Ajouter les nouveaux items à la commande existante
            const itemsToInsert = prefilledItems.map((item: any) => ({
              commande_id: existingCommande.id,
              article_id: item.article_id,
              designation: item.designation,
              reference: item.reference,
              quantite_commandee: item.quantite_commandee || item.quantite,
              quantite_recue: 0,
              prix_unitaire: item.prix_unitaire,
              total_ligne: (item.quantite_commandee || item.quantite) * item.prix_unitaire
            }));

            const { error } = await supabase
              .from('commande_items')
              .insert(itemsToInsert);

            if (!error) {
              toast({
                title: "Articles ajoutés",
                description: `${prefilledItems.length} article(s) ajouté(s) à la commande existante`,
              });
              
              // Recharger les commandes et ouvrir la commande mise à jour
              await fetchCommandes();
              setTimeout(() => {
                const updatedCommande = commandes.find(c => c.id === existingCommande.id);
                if (updatedCommande) {
                  editCommande(updatedCommande);
                }
              }, 500);
              return;
            }
          }
        }
        
        // Si pas de commande existante, créer une nouvelle
        const newItems = prefilledItems.map((item: any) => ({
          ...item,
          quantite_commandee: item.quantite_commandee || item.quantite,
          total_ligne: (item.quantite_commandee || item.quantite) * item.prix_unitaire
        }));
        setCurrentItems(newItems);
        
        const { totalHT, totalTTC } = calculateTotals(newItems as any, currentCommande.tva_taux);
        setCurrentCommande(prev => ({
          ...prev,
          fournisseur: fournisseurName || "",
          total_ht: totalHT,
          total_ttc: totalTTC
        }));
        
        if (fournisseurName) {
          filterArticlesByFournisseur(fournisseurName);
        }
        
        setIsCreating(true);
        
        toast({
          title: source === 'alerts' ? "Articles d'alerte ajoutés" : "Article d'alerte ajouté",
          description: `${prefilledItems.length} article(s) ajouté(s) à la commande`,
        });
      }
      
      // Gérer l'article pré-sélectionné depuis l'inventaire
      if (location.state?.preSelectedArticle) {
        const { preSelectedArticle, fournisseurNom } = location.state;
        
        // Vérifier s'il existe une commande en brouillon pour ce fournisseur
        if (fournisseurNom) {
          const { data: existingDrafts } = await supabase
            .from('commandes')
            .select('*, commande_items(*)')
            .eq('fournisseur', fournisseurNom)
            .eq('status', 'brouillon')
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingDrafts && existingDrafts.length > 0) {
            const existingCommande = existingDrafts[0];
            
            const { error } = await supabase
              .from('commande_items')
              .insert([{
                commande_id: existingCommande.id,
                article_id: preSelectedArticle.id,
                designation: preSelectedArticle.designation,
                reference: preSelectedArticle.reference,
                quantite_commandee: 1,
                quantite_recue: 0,
                prix_unitaire: preSelectedArticle.prix_achat,
                total_ligne: preSelectedArticle.prix_achat
              }]);

            if (!error) {
              toast({
                title: "Article ajouté",
                description: `${preSelectedArticle.designation} ajouté à la commande existante`,
              });
              
              await fetchCommandes();
              setTimeout(() => {
                const updatedCommande = commandes.find(c => c.id === existingCommande.id);
                if (updatedCommande) {
                  editCommande(updatedCommande);
                }
              }, 500);
              return;
            }
          }
        }
        
        // Si pas de commande existante, créer une nouvelle
        const newItem: CommandeItem = {
          article_id: preSelectedArticle.id,
          designation: preSelectedArticle.designation,
          reference: preSelectedArticle.reference,
          quantite_commandee: 1,
          prix_unitaire: preSelectedArticle.prix_achat,
          total_ligne: preSelectedArticle.prix_achat
        };
        
        setCurrentItems([newItem]);
        setCurrentCommande(prev => ({
          ...prev,
          fournisseur: fournisseurNom || prev.fournisseur || "",
          total_ht: preSelectedArticle.prix_achat,
          total_ttc: preSelectedArticle.prix_achat * (1 + prev.tva_taux / 100)
        }));
        
        if (fournisseurNom) {
          filterArticlesByFournisseur(fournisseurNom);
        }
        
        setIsCreating(true);
        
        toast({
          title: "Article ajouté",
          description: `${preSelectedArticle.designation} ajouté à la commande`,
        });
      }
    };
    
    handlePrefilledItems();
  }, [location.state]);

  // Ouvrir automatiquement la/les commande(s) fraîchement créée(s)
  useEffect(() => {
    const state = location.state as any;
    const ids: string[] | undefined = state?.openCommandeIds;
    
    if (ids && ids.length > 0 && commandes.length > 0) {
      // Trouver la première commande créée qui correspond aux IDs
      const toOpen = commandes.find(c => ids.includes(c.id as string));
      if (toOpen) {
        // Attendre un peu pour que le rendu soit terminé
        setTimeout(() => {
          editCommande(toOpen);
          toast({
            title: "Commandes créées",
            description: `${ids.length} commande(s) créée(s)`,
          });
        }, 100);
      }
      
      // Nettoyer le state pour éviter de réouvrir
      window.history.replaceState({}, document.title);
    }
  }, [commandes]);

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
        .select('id, designation, reference, prix_achat, fournisseur_id, code_barre')
        .order('designation');

      if (error) throw error;
      setArticles(data || []);
      setFilteredArticles(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterArticlesByFournisseur = async (fournisseurNom: string) => {
    if (!fournisseurNom) {
      setFilteredArticles(articles);
      setCurrentFournisseurId("");
      return;
    }

    try {
      // Trouver l'ID du fournisseur
      const fournisseur = fournisseurs.find(f => f.nom === fournisseurNom);
      if (!fournisseur) {
        setFilteredArticles(articles);
        setCurrentFournisseurId("");
        return;
      }
      
      // Stocker l'ID du fournisseur actuel
      setCurrentFournisseurId(fournisseur.id);

      // Récupérer les articles associés à ce fournisseur via article_fournisseurs
      const { data: articleFournisseurs, error } = await supabase
        .from('article_fournisseurs')
        .select('article_id')
        .eq('fournisseur_id', fournisseur.id)
        .eq('actif', true);

      if (error) throw error;

      const articleIdsFromAF = new Set(articleFournisseurs?.map(af => af.article_id) || []);

      // Filtrer les articles: ceux qui sont dans article_fournisseurs OU qui ont directement le fournisseur_id
      const filtered = articles.filter(article => 
        articleIdsFromAF.has(article.id) || article.fournisseur_id === fournisseur.id
      );

      setFilteredArticles(filtered);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setFilteredArticles(articles);
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

    // Recalibrer les brouillons de quantités pour suivre les nouveaux index
    setQtyDrafts((prev) => {
      const updated: Record<number, string> = {};
      Object.keys(prev).forEach((k) => {
        const i = Number(k);
        if (i < index) updated[i] = prev[i];
        else if (i > index) updated[i - 1] = prev[i];
      });
      return updated;
    });
    
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

  const addArticleDirectly = (articleId: string) => {
    const article = filteredArticles.find(a => a.id === articleId);
    if (!article) return;

    // Vérifier si l'article n'est pas déjà dans la liste
    const existingIndex = currentItems.findIndex(item => item.article_id === articleId);
    if (existingIndex !== -1) {
      // Incrémenter la quantité si l'article existe déjà
      const newItems = [...currentItems];
      newItems[existingIndex].quantite_commandee += 1;
      newItems[existingIndex].total_ligne = newItems[existingIndex].quantite_commandee * newItems[existingIndex].prix_unitaire;
      setCurrentItems(newItems);
      
      const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
      setCurrentCommande(prev => ({
        ...prev,
        total_ht: totalHT,
        total_ttc: totalTTC
      }));
      
      toast({
        title: "Quantité mise à jour",
        description: `${article.designation} : quantité augmentée`,
      });
    } else {
      // Ajouter un nouvel article
      const newItem: CommandeItem = {
        article_id: articleId,
        designation: article.designation,
        reference: article.reference,
        quantite_commandee: 1,
        prix_unitaire: article.prix_achat,
        total_ligne: article.prix_achat
      };
      
      const newItems = [...currentItems, newItem];
      setCurrentItems(newItems);
      
      const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
      setCurrentCommande(prev => ({
        ...prev,
        total_ht: totalHT,
        total_ttc: totalTTC
      }));
      
      toast({
        title: "Article ajouté",
        description: `${article.designation} ajouté à la commande`,
      });
    }
    
    setArticleSearchOpen(false);
  };

  const handleBarcodeScan = (barcode: string) => {
    setShowScanner(false);
    
    // Chercher l'article par code-barres
    const article = filteredArticles.find(a => a.code_barre === barcode);
    
    if (!article) {
      toast({
        title: "Article non trouvé",
        description: `Aucun article avec le code-barres ${barcode}`,
        variant: "destructive",
      });
      return;
    }
    
    // Vérifier si l'article n'est pas déjà dans la liste
    const existingIndex = currentItems.findIndex(item => item.article_id === article.id);
    if (existingIndex !== -1) {
      // Incrémenter la quantité si l'article existe déjà
      const newItems = [...currentItems];
      newItems[existingIndex].quantite_commandee += 1;
      newItems[existingIndex].total_ligne = newItems[existingIndex].quantite_commandee * newItems[existingIndex].prix_unitaire;
      setCurrentItems(newItems);
      
      const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
      setCurrentCommande(prev => ({
        ...prev,
        total_ht: totalHT,
        total_ttc: totalTTC
      }));
      
      toast({
        title: "Quantité mise à jour",
        description: `${article.designation} : quantité augmentée`,
      });
    } else {
      // Ajouter un nouvel article
      const newItem: CommandeItem = {
        article_id: article.id,
        designation: article.designation,
        reference: article.reference,
        quantite_commandee: 1,
        prix_unitaire: article.prix_achat,
        total_ligne: article.prix_achat
      };
      
      const newItems = [...currentItems, newItem];
      setCurrentItems(newItems);
      
      const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
      setCurrentCommande(prev => ({
        ...prev,
        total_ht: totalHT,
        total_ttc: totalTTC
      }));
      
      toast({
        title: "Article ajouté",
        description: `${article.designation} scanné et ajouté`,
      });
    }
  };

  const saveCommande = async (saveAsDraft: boolean = false) => {
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
      
      // Déterminer le statut en fonction du paramètre
      const finalStatus = saveAsDraft ? 'brouillon' : currentCommande.status;

      if (editingCommande) {
        const updatePayload = {
          fournisseur: currentCommande.fournisseur,
          email_fournisseur: currentCommande.email_fournisseur || "",
          telephone_fournisseur: currentCommande.telephone_fournisseur || "",
          adresse_fournisseur: currentCommande.adresse_fournisseur || "",
          notes: currentCommande.notes || "",
          status: finalStatus,
          total_ht: currentCommande.total_ht,
          total_ttc: currentCommande.total_ttc,
          tva_taux: currentCommande.tva_taux,
          user_id: currentCommande.user_id,
        };
        const { error: commandeError } = await supabase
          .from('commandes')
          .update(updatePayload)
          .eq('id', editingCommande.id);

        if (commandeError) throw commandeError;
        commandeId = editingCommande.id!;

        // Supprimer les anciens items
        await supabase
          .from('commande_items')
          .delete()
          .eq('commande_id', commandeId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const insertPayload = {
          fournisseur: currentCommande.fournisseur,
          email_fournisseur: currentCommande.email_fournisseur || "",
          telephone_fournisseur: currentCommande.telephone_fournisseur || "",
          adresse_fournisseur: currentCommande.adresse_fournisseur || "",
          notes: currentCommande.notes || "",
          status: finalStatus,
          total_ht: currentCommande.total_ht,
          total_ttc: currentCommande.total_ttc,
          tva_taux: currentCommande.tva_taux,
          user_id: user?.id,
          numero_commande: '' // Le trigger va générer le numéro automatiquement
        };
        const { data: commandeData, error: commandeError } = await supabase
          .from('commandes')
          .insert([insertPayload])
          .select()
          .single();

        if (commandeError) throw commandeError;
        commandeId = commandeData.id;
      }

      // Insérer les nouveaux items
      const itemsToInsert = currentItems.map(({ id, ...rest }) => ({
        ...rest,
        quantite_recue: 0,
        commande_id: commandeId
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Succès",
        description: saveAsDraft 
          ? "Commande sauvegardée en brouillon" 
          : (editingCommande ? "Commande modifiée" : "Commande créée"),
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
        tva_taux: 8.5,
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
    // Ne garder que les champs de la table `commandes` (éviter d'envoyer `items` au UPDATE)
    setCurrentCommande({
      fournisseur: commande.fournisseur,
      email_fournisseur: commande.email_fournisseur || "",
      telephone_fournisseur: commande.telephone_fournisseur || "",
      adresse_fournisseur: commande.adresse_fournisseur || "",
      notes: commande.notes || "",
      status: commande.status,
      total_ht: commande.total_ht,
      total_ttc: commande.total_ttc,
      tva_taux: commande.tva_taux,
      user_id: commande.user_id,
    });
    setCurrentItems(commande.items);
    setIsCreating(true);
    // Filtrer les articles par fournisseur lors de l'édition
    if (commande.fournisseur) {
      filterArticlesByFournisseur(commande.fournisseur);
    }
  };

  const deleteCommande = async (commandeId: string) => {
    try {
      // Supprimer d'abord les items de la commande
      const { error: itemsError } = await supabase
        .from('commande_items')
        .delete()
        .eq('commande_id', commandeId);

      if (itemsError) throw itemsError;

      // Puis supprimer la commande
      const { error: commandeError } = await supabase
        .from('commandes')
        .delete()
        .eq('id', commandeId);

      if (commandeError) throw commandeError;

      toast({
        title: "Succès",
        description: "Commande supprimée avec succès",
      });

      fetchCommandes();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
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
                tva_taux: 8.5,
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
                    {fournisseurs.length > 0 ? (
                      <>
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
                              filterArticlesByFournisseur(selectedFournisseur.nom);
                            } else if (value === "MANUAL_INPUT") {
                              // Ne rien faire, l'utilisateur va saisir manuellement
                              setFilteredArticles(articles);
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
                            <SelectItem value="MANUAL_INPUT" className="text-muted-foreground italic">
                              + Saisir manuellement
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="mt-2"
                          placeholder="Ou saisir le nom manuellement"
                          value={currentCommande.fournisseur}
                          onChange={(e) => setCurrentCommande(prev => ({ ...prev, fournisseur: e.target.value }))}
                        />
                      </>
                    ) : (
                      <Input
                        placeholder="Nom du fournisseur"
                        value={currentCommande.fournisseur}
                        onChange={(e) => setCurrentCommande(prev => ({ ...prev, fournisseur: e.target.value }))}
                      />
                    )}
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
                  <Select
                    value={currentCommande.tva_taux.toString()}
                    onValueChange={(value) => {
                      const newTva = parseFloat(value);
                      const { totalHT, totalTTC } = calculateTotals(currentItems, newTva);
                      setCurrentCommande(prev => ({
                        ...prev,
                        tva_taux: newTva,
                        total_ht: totalHT,
                        total_ttc: totalTTC
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="8.5">8,5%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
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

                {/* Liste des articles ajoutés */}
                {currentItems.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Articles ajoutés</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {currentItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.designation}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.reference} • {item.prix_unitaire.toFixed(2)} € × {item.quantite_commandee}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                value={qtyDrafts[index] ?? String(item.quantite_commandee)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setQtyDrafts((prev) => ({ ...prev, [index]: raw }));
                                  if (raw === '') return; // allow empty while typing
                                  const num = parseInt(raw, 10);
                                  if (!isNaN(num) && num > 0) {
                                    updateItem(index, 'quantite_commandee', num);
                                  }
                                }}
                                onBlur={() => {
                                  setQtyDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[index];
                                    return next;
                                  });
                                }}
                                onFocus={(e) => e.currentTarget.select()}
                                className="w-16 h-8 text-center"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="font-medium shrink-0">
                              {item.total_ligne.toFixed(2)} €
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Articles - Section compacte */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle>Ajouter des articles</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <SearchWithScanner
                    placeholder="Chercher ou scanner article..."
                    value={articleSearchQuery}
                    onChange={(value) => {
                      setArticleSearchQuery(value);
                      // Si c'est un ID d'article (UUID), l'ajouter directement
                      if (value.length === 36 && value.includes('-')) {
                        addArticleDirectly(value);
                        setArticleSearchQuery("");
                      }
                    }}
                    onArticleNotFound={() => {}}
                    returnTo="/commandes"
                  />
                  <Button onClick={() => setShowCreateArticleDialog(true)} size="sm" variant="outline" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel article
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Aucun article ajouté</p>
                  <p className="text-xs mt-1">Utilisez les boutons ci-dessus pour ajouter des articles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentItems.filter(item => !item.article_id).map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Saisie manuelle #{currentItems.filter((it, idx) => !it.article_id && idx <= index).length}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`designation-${index}`} className="text-xs">Désignation *</Label>
                          <Input
                            id={`designation-${index}`}
                            value={item.designation}
                            onChange={(e) => updateItem(index, 'designation', e.target.value)}
                            placeholder="Nom de l'article"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`reference-${index}`} className="text-xs">Référence</Label>
                          <Input
                            id={`reference-${index}`}
                            value={item.reference || ''}
                            onChange={(e) => updateItem(index, 'reference', e.target.value)}
                            placeholder="Référence"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`quantite-${index}`} className="text-xs">Quantité *</Label>
                          <Input
                            id={`quantite-${index}`}
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={qtyDrafts[index] ?? String(item.quantite_commandee)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setQtyDrafts((prev) => ({ ...prev, [index]: raw }));
                              if (raw === '') return;
                              const num = parseInt(raw, 10);
                              if (!isNaN(num) && num > 0) {
                                updateItem(index, 'quantite_commandee', num);
                              }
                            }}
                            onBlur={() => {
                              setQtyDrafts((prev) => {
                                const next = { ...prev };
                                delete next[index];
                                return next;
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`prix-${index}`} className="text-xs">Prix unitaire (€) *</Label>
                          <Input
                            id={`prix-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.prix_unitaire}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : e.target.value;
                              if (value === '') {
                                updateItem(index, 'prix_unitaire', 0);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  updateItem(index, 'prix_unitaire', numValue);
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total ligne: </span>
                          <span className="font-medium">{item.total_ligne.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <Button variant="secondary" onClick={() => saveCommande(true)}>
              Sauvegarder en brouillon
            </Button>
            <Button onClick={() => saveCommande(false)}>
              {editingCommande ? 'Valider' : 'Créer'} la commande
            </Button>
          </div>

          {/* Overlays for creation flow */}
          <BarcodeScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onScanResult={handleBarcodeScan}
          />

          <CreateArticleDialog
            open={showCreateArticleDialog}
            onOpenChange={setShowCreateArticleDialog}
            defaultFournisseurId={currentFournisseurId}
            onArticleCreated={async () => {
              await fetchArticles();
              setShowCreateArticleDialog(false);
              toast({
                title: "Succès",
                description: "Article créé avec succès",
              });
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Commandes</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setShowSmartOrder(true)} variant="outline" className="w-full sm:w-auto">
                <Brain className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Commande intelligente</span>
                <span className="sm:hidden">Intelligence</span>
              </Button>
              <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
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

        <div className="grid gap-4 sm:gap-6">
          {commandes.length > 0 ? commandes.map((commande) => (
            <Card key={commande.id}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                      <span className="break-words">{commande?.numero_commande || 'N/A'}</span>
                      <Badge variant={getStatusColor(commande?.status || 'brouillon') as any} className="shrink-0">
                        {getStatusLabel(commande?.status || 'brouillon')}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {commande?.fournisseur || 'Fournisseur non renseigné'} • {commande?.items?.length || 0} article(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editCommande(commande)}
                      className="shrink-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {(commande?.status === 'envoye' || commande?.status === 'confirme' || commande?.status === 'recu_partiel') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReceptionDialog({
                          isOpen: true,
                          commande: commande
                        })}
                        className="shrink-0"
                      >
                        <PackageCheck className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Réceptionner</span>
                      </Button>
                    )}
                    {commande?.status === 'brouillon' && isAdmin() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog({
                          isOpen: true,
                          commande: commande
                        })}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    {isAdmin() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchaseOrderDialog({
                          isOpen: true,
                          commande: commande
                        })}
                        className="shrink-0"
                      >
                        <Mail className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Envoyer la commande</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Informations</h4>
                    <p className="text-sm break-words">Email: {commande?.email_fournisseur || "Non renseigné"}</p>
                    <p className="text-sm break-words">Tél: {commande?.telephone_fournisseur || "Non renseigné"}</p>
                    <p className="text-sm">Date: {commande?.date_creation ? new Date(commande.date_creation).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Totaux</h4>
                    <p className="text-sm">Total HT: {(commande?.total_ht || 0).toFixed(2)} €</p>
                    <p className="text-sm">TVA: {((commande?.total_ttc || 0) - (commande?.total_ht || 0)).toFixed(2)} €</p>
                    <p className="font-medium">Total TTC: {(commande?.total_ttc || 0).toFixed(2)} €</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Articles</h4>
                    {(commande?.items || []).slice(0, 3).map((item, idx) => (
                      <p key={idx} className="text-sm break-words">
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
        onEmailSent={() => {
          setPurchaseOrderDialog({ isOpen: false });
          setIsCreating(false);
          setEditingCommande(null);
          fetchCommandes();
        }}
        commande={purchaseOrderDialog.commande as any}
        items={purchaseOrderDialog.commande?.items || []}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanResult={handleBarcodeScan}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la commande {deleteDialog.commande?.numero_commande} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ isOpen: false })}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.commande?.id) {
                  deleteCommande(deleteDialog.commande.id);
                }
                setDeleteDialog({ isOpen: false });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reception Dialog */}
      <ReceptionCommandeDialog
        isOpen={receptionDialog.isOpen}
        onClose={() => setReceptionDialog({ isOpen: false })}
        commandeId={receptionDialog.commande?.id || ''}
        commandeNumero={receptionDialog.commande?.numero_commande || ''}
        onSuccess={fetchCommandes}
      />

      {/* Create Article Dialog */}
      <CreateArticleDialog
        open={showCreateArticleDialog}
        onOpenChange={setShowCreateArticleDialog}
        defaultFournisseurId={currentFournisseurId}
        onArticleCreated={async () => {
          await fetchArticles();
          setShowCreateArticleDialog(false);
          toast({
            title: "Succès",
            description: "Article créé avec succès",
          });
        }}
      />
    </DashboardLayout>
  );
}