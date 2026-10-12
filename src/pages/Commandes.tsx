import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ShoppingCart, Mail, Download, Edit, Brain, Search, Check, ScanBarcode, PackageCheck, FileText, ChevronDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import { PurchaseOrderDialog } from "@/components/commandes/PurchaseOrderDialog";
import { SmartOrderDialog } from "@/components/commandes/SmartOrderDialog";
import { CreateArticleDialog } from "@/components/articles/CreateArticleDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OrderLineForm, vehicleShort, type NewOrderLine } from "@/components/commandes/OrderLineForm";
import { printPurchaseOrder } from "@/lib/printPurchaseOrder";
import { autoSendPurchaseOrder } from "@/lib/sendPurchaseOrderEmail";
import { validationMessage, type ValidationOutcome } from "@/lib/orderValidationMessage";
import { OrderArticleSearch, stockTone, type OrderSearchContext } from "@/components/commandes/OrderArticleSearch";
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
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeletons/PageSkeleton";

interface Article {
  id: string;
  designation: string;
  reference: string;
  prix_achat: number;
  fournisseur_id?: string;
  code_barre?: string;
  marque?: string | null;
  categorie?: string | null;
  sous_categorie?: string | null;
  stock?: number;
  stock_min?: number;
}

interface CommandeItem {
  id?: string;
  article_id?: string;
  designation: string;
  reference?: string;
  quantite_commandee: number;
  prix_unitaire: number;
  total_ligne: number;
  is_draft?: boolean;
  code_barre?: string;
  vehicule_id?: string | null;
  categorie?: string | null;
  sous_categorie?: string | null;
  precision_note?: string | null;
  reference_a_confirmer?: boolean;
  vehicule_libre?: string | null;
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

const notifySuccess = (message: string) =>
  sonnerToast(message, {
    duration: 4000,
    position: "bottom-center",
    className: "!bg-success !text-success-foreground !border-success",
  });

const notifyWarning = (message: string) =>
  sonnerToast(message, {
    duration: 4000,
    position: "bottom-center",
    className: "!bg-warning !text-warning-foreground !border-warning",
  });

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
  const [validateOpen, setValidateOpen] = useState(false);
  const [missingEmailOpen, setMissingEmailOpen] = useState(false);
  const [vehicMap, setVehicMap] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('vehicules').select('id, immatriculation, marque, modele').then(({ data }) =>
      setVehicMap(Object.fromEntries((data || []).map((v: any) => [v.id, vehicleShort(v)]))));
  }, []);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isChefAgence } = useRoleAccess();

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
        .select('id, designation, reference, prix_achat, fournisseur_id, code_barre, marque, categorie, sous_categorie, stock, stock_min')
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
        is_draft: true,
      }
    ]);
  };

  const pushLines = (newItems: CommandeItem[]) => {
    setCurrentItems(newItems);
    const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
    setCurrentCommande(prev => ({ ...prev, total_ht: totalHT, total_ttc: totalTTC }));
  };

  const addCategoryLine = (l: NewOrderLine) => {
    const label = `${l.categorie}${l.sous_categorie ? ` > ${l.sous_categorie}` : ''}`;
    pushLines([...currentItems, {
      designation: label, reference: "", quantite_commandee: l.quantite, prix_unitaire: 0, total_ligne: 0,
      is_draft: true, categorie: l.categorie, sous_categorie: l.sous_categorie,
      vehicule_id: l.vehicule?.id || null, vehicule_libre: l.vehicule_libre || null, precision_note: l.precision || null,
    }]);
    if (l.vehicule) setVehicMap(prev => ({ ...prev, [l.vehicule!.id]: vehicleShort(l.vehicule!) }));
  };

  const addUnsureLine = (ctx: OrderSearchContext) => {
    const label = ctx.sous_categorie || ctx.categorie || 'Article';
    pushLines([...currentItems, {
      designation: `${label}${ctx.vehicule ? ` — ${ctx.vehicule.marque} ${ctx.vehicule.modele}` : ''}`,
      reference: "", quantite_commandee: 1, prix_unitaire: 0, total_ligne: 0, is_draft: true,
      reference_a_confirmer: true, precision_note: "",
      categorie: ctx.categorie, sous_categorie: ctx.sous_categorie, vehicule_id: ctx.vehicule?.id || null,
    }]);
    toast({ title: "Ligne ajoutée", description: "Référence à confirmer — ajoutez une précision" });
  };

  const addFreeLine = (text: string, qty = 1, price = 0, ctx?: OrderSearchContext) => {
    const designation = text.trim();
    if (!designation) return;
    const newItems: CommandeItem[] = [...currentItems, { designation, reference: "", quantite_commandee: qty, prix_unitaire: price, total_ligne: qty * price, is_draft: true,
      categorie: ctx?.categorie || null, sous_categorie: ctx?.sous_categorie || null, vehicule_id: ctx?.vehicule?.id || null }];
    setCurrentItems(newItems);
    const { totalHT, totalTTC } = calculateTotals(newItems, currentCommande.tva_taux);
    setCurrentCommande(prev => ({ ...prev, total_ht: totalHT, total_ttc: totalTTC }));
    toast({ title: "Ligne ajoutée", description: `${designation} × ${qty}` });
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

  const addArticleDirectly = (articleId: string, ctx?: OrderSearchContext) => {
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
        categorie: article.categorie || null,
        sous_categorie: article.sous_categorie || null,
        vehicule_id: ctx?.vehicule?.id || null,
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
    const code = barcode.trim();
    const article = articles.find(a => (a.code_barre || "").trim() === code);
    
    if (!article) {
      setCurrentItems(prev => [...prev, { designation: "", reference: "", quantite_commandee: 1, prix_unitaire: 0, total_ligne: 0, is_draft: true, code_barre: code }]);
      toast({
        title: "Nouvel article",
        description: `Code-barres ${code} inconnu : complétez la désignation`,
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

  const saveCommande = async (finalStatus: 'brouillon' | 'confirme' = 'brouillon', opts: { stay?: boolean; silent?: boolean } = {}) => {
    if (!currentCommande.fournisseur.trim() || currentItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner le fournisseur et ajouter au moins un article",
        variant: "destructive",
      });
      return null;
    }
    if (currentItems.some(i => !i.designation.trim() || i.quantite_commandee < 1)) {
      toast({ title: "Ligne incomplète", description: "Chaque ligne doit avoir une désignation et une quantité d'au moins 1.", variant: "destructive" });
      return null;
    }

    try {
      let commandeId: string;
      
      let numero = editingCommande?.numero_commande || "";

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
        numero = commandeData.numero_commande;
      }

      // Insérer les nouveaux items
      const itemsToInsert = currentItems.map(({ id, ...rest }: any) => ({
        ...rest,
        is_draft: !rest.article_id,
        quantite_recue: 0,
        commande_id: commandeId
      }));

      const { error: itemsError } = await supabase
        .from('commande_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      if (!opts.silent) {
        toast({
          title: "Succès",
          description: finalStatus === 'confirme' ? "Commande validée" : "Brouillon sauvegardé",
        });
      }

      const saved = {
        ...currentCommande, id: commandeId, numero_commande: numero, status: finalStatus,
        date_creation: editingCommande?.date_creation || new Date().toISOString(),
        items: itemsToInsert as any,
      };
      if (opts.stay) {
        setEditingCommande(saved as any);
        setCurrentCommande(prev => ({ ...prev, numero_commande: numero, status: finalStatus }));
      } else {
        resetForm();
      }
      fetchCommandes();
      return saved;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingCommande(null);
    setCurrentCommande({
      fournisseur: "", email_fournisseur: "", telephone_fournisseur: "", adresse_fournisseur: "",
      notes: "", status: "brouillon", total_ht: 0, total_ttc: 0, tva_taux: 8.5, user_id: undefined,
    });
    setCurrentItems([]);
    setQtyDrafts({});
  };

  const changeTva = (taux: number) => {
    const { totalHT, totalTTC } = calculateTotals(currentItems, taux);
    setCurrentCommande(prev => ({ ...prev, tva_taux: taux, total_ht: totalHT, total_ttc: totalTTC }));
  };

  const poItems = () => currentItems.map(i => ({ ...i, vehicule_label: i.vehicule_id ? vehicMap[i.vehicule_id] : (i.vehicule_libre || null) }));

  const confirmValidation = async (forceNoEmail = false) => {
    const email = currentCommande.email_fournisseur?.trim() || "";
    const saved = await saveCommande('confirme', { silent: true });
    setValidateOpen(false);
    setMissingEmailOpen(false);
    if (!saved) return;

    const numero = saved.numero_commande || "";
    let sent = false;

    if (!forceNoEmail && email) {
      try {
        await autoSendPurchaseOrder(saved as any, (saved.items || []).map((i: any) => ({
          designation: i.designation,
          reference: i.reference || undefined,
          quantite_commandee: i.quantite_commandee || 0,
          prix_unitaire: i.prix_unitaire || 0,
          total_ligne: i.total_ligne || 0,
        })));
        sent = true;
      } catch (error: any) {
        console.error("Envoi automatique du bon de commande impossible:", error);
      }
    }

    const outcome: ValidationOutcome = sent ? "sent" : email ? "send-failed" : "no-email";
    const message = validationMessage(numero, outcome, email);
    if (outcome === "sent") notifySuccess(message);
    else notifyWarning(message);

    resetForm();
    fetchCommandes();
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirme': return 'bg-accent/15 text-accent border-accent/30';
      case 'envoye': return 'bg-primary/15 text-primary border-primary/30';
      case 'recu_partiel': return 'bg-warning/15 text-warning border-warning/30';
      case 'recu_complet': return 'bg-success/15 text-success border-success/30';
      case 'annule': return 'bg-destructive/15 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'brouillon': return 'Brouillon';
      case 'envoye': return 'Envoyée';
      case 'confirme': return 'Validée';
      case 'recu_partiel': return 'Partiellement reçue';
      case 'recu_complet': return 'Reçue';
      case 'annule': return 'Annulée';
      default: return status;
    }
  };

  if (isCreating) {
    const status = editingCommande?.status || 'brouillon';
    const steps = [
      { key: 'brouillon', label: 'Brouillon' },
      { key: 'confirme', label: 'Validée' },
      { key: 'envoye', label: 'Envoyée' },
      { key: 'recu_complet', label: 'Reçue' },
    ];
    const stepIndex = { brouillon: 0, confirme: 1, envoye: 2, recu_partiel: 2, recu_complet: 3 }[status as string] ?? 0;
    const hasSupplier = !!currentCommande.fournisseur.trim();
    const tvaAmount = currentCommande.total_ttc - currentCommande.total_ht;
    const nbArticles = currentItems.reduce((n, i) => n + (i.quantite_commandee || 0), 0);
    const canValidate = hasSupplier && currentItems.length > 0;
    const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    return (
      <DashboardLayout>
        <div className="space-y-5 pb-24 md:pb-4">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {editingCommande ? 'Modifier la commande' : 'Nouvelle commande'}
            </h1>
            <ol className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" aria-label="Progression de la commande">
              {steps.map((st, i) => (
                <li key={st.key} className="flex items-center gap-1 sm:gap-2">
                  <span className={`flex items-center gap-1.5 ${i <= stepIndex ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    <span className={`h-3 w-3 rounded-full border-2 ${i <= stepIndex ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`} />
                    {st.label}
                  </span>
                  {i < steps.length - 1 && <span className={`h-px w-4 sm:w-10 ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />}
                </li>
              ))}
            </ol>
          </div>

          {/* BLOC 1 — En-tête */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              <div>
                <p className="text-xs text-muted-foreground">N° de commande</p>
                <p className="font-mono font-semibold">{currentCommande.numero_commande || editingCommande?.numero_commande || 'Attribué à l\u2019enregistrement'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date de création</p>
                <p className="font-semibold">{new Date(editingCommande?.date_creation || Date.now()).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="col-span-2">
                <Label htmlFor="fournisseur" className="text-xs">Fournisseur *</Label>
                <Input
                  id="fournisseur"
                  list="fournisseurs-list"
                  autoFocus={!hasSupplier}
                  placeholder="Choisir ou saisir un fournisseur"
                  value={currentCommande.fournisseur}
                  onChange={(e) => {
                    const value = e.target.value;
                    const f = fournisseurs.find(x => x.nom.toLowerCase() === value.trim().toLowerCase());
                    setCurrentCommande(prev => ({
                      ...prev,
                      fournisseur: value,
                      ...(f ? { email_fournisseur: f.email || "", telephone_fournisseur: f.telephone || "", adresse_fournisseur: f.adresse || "" } : {}),
                    }));
                    if (f) filterArticlesByFournisseur(f.nom); else setFilteredArticles(articles);
                  }}
                  className="bg-background"
                />
                <datalist id="fournisseurs-list">
                  {fournisseurs.map((f) => <option key={f.id} value={f.nom} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 col-span-2 lg:col-span-1">
                <div>
                  <Label className="text-xs">TVA</Label>
                  <Select value={String(currentCommande.tva_taux)} onValueChange={(v) => changeTva(parseFloat(v))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 2.1, 8.5, 20].map(t => <SelectItem key={t} value={String(t)}>{String(t).replace('.', ',')} %</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Statut</p>
                  <Badge variant="outline" className={getStatusClass(status)}>{getStatusLabel(status)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLOC 2 — Articles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Articles à commander</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSupplier ? (
                <OrderLineForm onAdd={addCategoryLine} />
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
                  Renseignez d'abord le fournisseur ci-dessus pour ajouter des articles.
                </p>
              )}

              {currentItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Aucune ligne ajoutée</p>
                  <p className="text-xs mt-1">Choisissez une catégorie et une quantité. La référence exacte sera saisie à la réception.</p>
                </div>
              ) : (
                <div className="rounded-lg border divide-y">
                  <div className="hidden md:grid grid-cols-[1.3fr_1fr_minmax(11.25rem,1.6fr)_5.5rem_2.5rem] gap-2 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground bg-muted/40">
                    <span>Catégorie › Sous-cat.</span><span>Précision</span><span>Véhicule</span><span className="text-right">Qté</span><span />
                  </div>
                  {currentItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_5.5rem_2.5rem] md:grid-cols-[1.3fr_1fr_minmax(11.25rem,1.6fr)_5.5rem_2.5rem] gap-2 px-3 py-3 items-center">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {item.categorie ? `${item.categorie}${item.sous_categorie ? ` › ${item.sous_categorie}` : ''}` : item.designation}
                        </p>
                        <div className="md:hidden text-xs text-muted-foreground space-y-0.5">
                          {item.precision_note && <p className="italic">« {item.precision_note} »</p>}
                          {item.vehicule_id && <p className="text-accent font-medium">🚘 {vehicMap[item.vehicule_id] || 'Véhicule'}</p>}
                          {!item.vehicule_id && item.vehicule_libre && <p className="text-muted-foreground"><span className="grayscale opacity-60">🚗</span> {item.vehicule_libre}</p>}
                        </div>
                      </div>
                      <p className="hidden md:block text-sm text-muted-foreground italic truncate">{item.precision_note || '—'}</p>
                      <p className="hidden md:block text-sm truncate">{item.vehicule_id ? <span className="text-accent font-medium">🚘 {vehicMap[item.vehicule_id] || 'Véhicule'}</span> : item.vehicule_libre ? <span className="text-muted-foreground" title="Véhicule hors flotte"><span className="grayscale opacity-60">🚗</span> {item.vehicule_libre}</span> : <span className="block text-center text-muted-foreground">—</span>}</p>
                      <Input
                        type="number" inputMode="numeric" min="1" aria-label="Quantité" className="text-right"
                        onFocus={(e) => e.currentTarget.select()}
                        value={qtyDrafts[index] ?? String(item.quantite_commandee)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setQtyDrafts((prev) => ({ ...prev, [index]: raw }));
                          const num = parseInt(raw, 10);
                          if (!isNaN(num) && num >= 1) updateItem(index, 'quantite_commandee', num);
                        }}
                        onBlur={() => setQtyDrafts((prev) => { const next = { ...prev }; delete next[index]; return next; })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label="Supprimer la ligne"
                        className="h-8 w-8 justify-self-end text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-6 rounded-lg bg-muted/40 p-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Lignes</p><p className="font-semibold">{currentItems.length}</p></div>
                <div><p className="text-xs text-muted-foreground">Unités commandées</p><p className="font-semibold">{nbArticles}</p></div>
                <p className="text-xs text-muted-foreground self-center">Références et prix réels sont saisis à la réception.</p>
              </div>
            </CardContent>
          </Card>

          {/* BLOC 3 — Barre d'actions */}
          <div className="sticky bottom-20 md:bottom-0 z-30 -mx-4 sm:mx-0 rounded-none sm:rounded-xl border-t sm:border bg-background/95 backdrop-blur shadow-lg">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
              <Button variant="ghost" onClick={resetForm}>Annuler</Button>
              <Button variant="secondary" onClick={() => saveCommande('brouillon', { stay: true })}>Sauvegarder brouillon</Button>
              <div className="flex-1" />
              <Button variant="outline" disabled={!canValidate}
                onClick={() => printPurchaseOrder({ numero: currentCommande.numero_commande, fournisseur: currentCommande.fournisseur, items: poItems() })}>
                <Download className="w-4 h-4 mr-2" />Générer PDF
              </Button>
              <Button disabled={!canValidate} onClick={() => (currentCommande.email_fournisseur?.trim() ? setValidateOpen(true) : setMissingEmailOpen(true))}>
                <Mail className="w-4 h-4 mr-2" />Valider et envoyer
              </Button>
            </div>
          </div>

          <AlertDialog open={validateOpen} onOpenChange={setValidateOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Valider la commande</AlertDialogTitle>
                <AlertDialogDescription>Vérifiez le récapitulatif avant de confirmer.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3">
                  <div><p className="text-xs text-muted-foreground">Fournisseur</p><p className="font-semibold break-words">{currentCommande.fournisseur}</p></div>
                  <div><p className="text-xs text-muted-foreground">Articles</p><p className="font-semibold">{currentItems.length}</p></div>
                  <div><p className="text-xs text-muted-foreground">Unités</p><p className="font-semibold">{nbArticles}</p></div>
                </div>
                <div>
                  <Label htmlFor="email-fournisseur" className="text-xs">Email du fournisseur</Label>
                  <Input id="email-fournisseur" type="email" placeholder="email@fournisseur.com"
                    value={currentCommande.email_fournisseur || ''}
                    onChange={(e) => setCurrentCommande(prev => ({ ...prev, email_fournisseur: e.target.value }))} />
                  <p className="mt-1 text-xs text-muted-foreground">Le bon de commande est envoyé automatiquement à cette adresse après validation.</p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <Button onClick={() => confirmValidation()} disabled={!currentCommande.email_fournisseur?.trim()}>Confirmer</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={missingEmailOpen} onOpenChange={setMissingEmailOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ Email fournisseur manquant</AlertDialogTitle>
                <AlertDialogDescription>
                  Le fournisseur « {currentCommande.fournisseur} » n'a pas d'adresse email enregistrée.
                  Le bon de commande ne pourra pas être envoyé automatiquement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <Button onClick={() => confirmValidation(true)}>Valider quand même</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
          <PageSkeleton />
        ) : (

        <div className="grid gap-4 sm:gap-6">
          {commandes.length > 0 ? commandes.map((commande) => (
            <Card key={commande.id}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                      <span className="break-words">{commande?.numero_commande || 'N/A'}</span>
                      <Badge variant="outline" className={`shrink-0 ${getStatusClass(commande?.status || 'brouillon')}`}>
                        {getStatusLabel(commande?.status || 'brouillon')}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {commande?.fournisseur || 'Fournisseur non renseigné'} • {commande?.items?.length || 0} article(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {commande?.status === 'brouillon' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editCommande(commande)}
                      className="shrink-0"
                      aria-label="Modifier le brouillon"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    )}
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
                    {commande?.status === 'brouillon' && (isAdmin() || isChefAgence()) && (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printPurchaseOrder({
                        numero: commande.numero_commande,
                        fournisseur: commande.fournisseur,
                        items: (commande.items || []).map(i => ({ ...i, vehicule_label: i.vehicule_id ? vehicMap[i.vehicule_id] : (i.vehicule_libre || null) })),
                      })}
                      className="shrink-0"
                    >
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Générer PDF</span>
                    </Button>
                    {(isAdmin() || isChefAgence()) && (
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
            <EmptyState
              icon={<ShoppingCart className="h-8 w-8" />}
              title="Aucune commande"
              description="Créez votre première commande fournisseur depuis les alertes stock."
              action={{ label: "Voir les alertes", onClick: () => navigate('/alertes') }}
            />
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
      <AlertDialog open={cancelDialog.isOpen} onOpenChange={(open) => !open && setCancelDialog({ isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Annuler la commande {cancelDialog.commande?.numero_commande} ?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motif-annulation">Motif d'annulation *</Label>
            <Textarea id="motif-annulation" value={cancelMotif} onChange={(e) => setCancelMotif(e.target.value)} />
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. La commande restera visible dans l'historique avec le statut « Annulée ».
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <Button variant="destructive" disabled={!cancelMotif.trim()} onClick={cancelCommande}>
              Confirmer l'annulation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.commande?.status && deleteDialog.commande.status !== 'brouillon'
                ? "⚠️ Cette suppression est définitive et irréversible. Préférez l'annulation pour conserver la traçabilité."
                : `Êtes-vous sûr de vouloir supprimer la commande ${deleteDialog.commande?.numero_commande} ? Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteDialog.commande?.status && deleteDialog.commande.status !== 'brouillon' && orderPermissions(userRole, deleteDialog.commande.status, false).canCancel && (
              <Button variant="outline" onClick={() => { const c = deleteDialog.commande; setDeleteDialog({ isOpen: false }); setCancelMotif(""); setCancelDialog({ isOpen: true, commande: c }); }}>
                Annuler plutôt
              </Button>
            )}
            <AlertDialogCancel onClick={() => setDeleteDialog({ isOpen: false })}>
              Retour
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
              {deleteDialog.commande?.status !== 'brouillon' ? 'Supprimer définitivement' : 'Supprimer'}
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