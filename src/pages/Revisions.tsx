import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wrench, AlertTriangle, CheckCircle, ShoppingCart, Package, Minus,
  Car, ChevronRight, ArrowLeft, Search, Disc, Filter, Cog, Zap,
  Droplet, Wind, Gauge, Lightbulb, Layers, X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { cn } from "@/lib/utils";
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

// Mapping mots-clés → icône (workflow type Oscaro)
const CATEGORY_ICONS: { keyword: string; icon: typeof Disc; label: string }[] = [
  { keyword: "frein", icon: Disc, label: "Freinage" },
  { keyword: "plaquette", icon: Disc, label: "Freinage" },
  { keyword: "disque", icon: Disc, label: "Freinage" },
  { keyword: "filtr", icon: Filter, label: "Filtration" },
  { keyword: "huile", icon: Droplet, label: "Lubrifiants" },
  { keyword: "vidange", icon: Droplet, label: "Lubrifiants" },
  { keyword: "distribution", icon: Cog, label: "Distribution" },
  { keyword: "courroie", icon: Cog, label: "Distribution" },
  { keyword: "allumage", icon: Zap, label: "Allumage" },
  { keyword: "bougie", icon: Zap, label: "Allumage" },
  { keyword: "batterie", icon: Zap, label: "Électricité" },
  { keyword: "ampoule", icon: Lightbulb, label: "Éclairage" },
  { keyword: "phare", icon: Lightbulb, label: "Éclairage" },
  { keyword: "amortisseur", icon: Gauge, label: "Suspension" },
  { keyword: "suspension", icon: Gauge, label: "Suspension" },
  { keyword: "echappement", icon: Wind, label: "Échappement" },
  { keyword: "pneu", icon: Layers, label: "Pneumatiques" },
];

function getCategoryMeta(categorie: string) {
  const lower = categorie.toLowerCase();
  const match = CATEGORY_ICONS.find((c) => lower.includes(c.keyword));
  return match ?? { icon: Package, label: categorie || "Divers" };
}

export default function Revisions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCollapsed] = useSidebarCollapsed();

  // Workflow étapes : marque -> modele -> motorisation -> catalog
  const [stepMarque, setStepMarque] = useState<string | null>(null);
  const [stepModele, setStepModele] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<VehiculeGroup | null>(null);
  const [useNonRegisteredVehicle, setUseNonRegisteredVehicle] = useState(false);
  const [showNonRegisteredDialog, setShowNonRegisteredDialog] = useState(false);
  const [nonRegisteredVehicle, setNonRegisteredVehicle] = useState({
    marque: "", modele: "", motorisation: "",
  });

  const [quantiteRevision, setQuantiteRevision] = useState<number | "">(1);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [articleQuantities, setArticleQuantities] = useState<Record<string, number>>({});
  const [showSortieDialog, setShowSortieDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-actifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules").select("*").eq("actif", true)
        .order("marque", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: articlesCompatibles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["articles-compatibles", selectedGroup?.marque, selectedGroup?.modele, selectedGroup?.motorisation, useNonRegisteredVehicle],
    queryFn: async () => {
      if (useNonRegisteredVehicle) {
        const { data, error } = await supabase
          .from("articles").select("*").order("designation", { ascending: true });
        if (error) throw error;
        return data;
      }
      if (!selectedGroup || selectedGroup.vehicules.length === 0) return [];
      const vehiculeIds = selectedGroup.vehicules.map((v) => v.id);
      const { data, error } = await supabase
        .from("articles")
        .select(`*, article_vehicules!inner (notes, vehicule_id)`)
        .in("article_vehicules.vehicule_id", vehiculeIds);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGroup || useNonRegisteredVehicle,
  });

  // Groupes véhicules
  const vehiculeGroups: VehiculeGroup[] = useMemo(() => {
    return vehicules.reduce((groups: VehiculeGroup[], vehicule) => {
      const existing = groups.find(
        (g) => g.marque === vehicule.marque && g.modele === vehicule.modele && g.motorisation === vehicule.motorisation
      );
      if (existing) {
        existing.count++;
        existing.vehicules.push(vehicule);
      } else {
        groups.push({
          marque: vehicule.marque,
          modele: vehicule.modele,
          motorisation: vehicule.motorisation,
          count: 1,
          vehicules: [vehicule],
        });
      }
      return groups;
    }, []);
  }, [vehicules]);

  // Étape entonnoir : marques → modèles → motorisations
  const marques = useMemo(() => {
    const map = new Map<string, number>();
    vehiculeGroups.forEach((g) => map.set(g.marque, (map.get(g.marque) || 0) + g.count));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [vehiculeGroups]);

  const modeles = useMemo(() => {
    if (!stepMarque) return [];
    const map = new Map<string, number>();
    vehiculeGroups
      .filter((g) => g.marque === stepMarque)
      .forEach((g) => map.set(g.modele, (map.get(g.modele) || 0) + g.count));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stepMarque, vehiculeGroups]);

  const motorisations = useMemo(() => {
    if (!stepMarque || !stepModele) return [];
    return vehiculeGroups
      .filter((g) => g.marque === stepMarque && g.modele === stepModele)
      .sort((a, b) => (a.motorisation || "").localeCompare(b.motorisation || ""));
  }, [stepMarque, stepModele, vehiculeGroups]);

  // Catégories regroupées (workflow Oscaro)
  const categoriesGrouped = useMemo(() => {
    const map = new Map<string, { label: string; icon: typeof Disc; count: number; categories: Set<string> }>();
    articlesCompatibles.forEach((a) => {
      const meta = getCategoryMeta(a.categorie);
      const existing = map.get(meta.label);
      if (existing) {
        existing.count++;
        existing.categories.add(a.categorie);
      } else {
        map.set(meta.label, { label: meta.label, icon: meta.icon, count: 1, categories: new Set([a.categorie]) });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [articlesCompatibles]);

  const filteredArticles = useMemo(() => {
    return articlesCompatibles.filter((a) => {
      if (activeCategory) {
        const meta = getCategoryMeta(a.categorie);
        if (meta.label !== activeCategory) return false;
      }
      if (articleSearchQuery) {
        const q = articleSearchQuery.toLowerCase();
        if (!a.designation.toLowerCase().includes(q) && !a.reference.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [articlesCompatibles, activeCategory, articleSearchQuery]);

  const analyseStock = (article: Article, quantiteNecessaire: number) => {
    const stockDisponible = article.stock;
    const stockManquant = Math.max(0, quantiteNecessaire - stockDisponible);
    return {
      disponible: stockDisponible,
      necessaire: quantiteNecessaire,
      manquant: stockManquant,
      suffisant: stockDisponible >= quantiteNecessaire,
    };
  };

  const resetWorkflow = () => {
    setStepMarque(null);
    setStepModele(null);
    setSelectedGroup(null);
    setUseNonRegisteredVehicle(false);
    setSelectedArticles(new Set());
    setArticleQuantities({});
    setActiveCategory(null);
    setArticleSearchQuery("");
  };

  const pickGroup = (group: VehiculeGroup) => {
    setUseNonRegisteredVehicle(false);
    setSelectedGroup(group);
    setSelectedArticles(new Set());
    setArticleQuantities({});
    setActiveCategory(null);
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
      vehicules: [],
    });
    setShowNonRegisteredDialog(false);
    setSelectedArticles(new Set());
    setArticleQuantities({});
    setActiveCategory(null);
  };

  const handleArticleSelection = (articleId: string, checked: boolean) => {
    const newSelected = new Set(selectedArticles);
    const qtyRevision = typeof quantiteRevision === "number" ? quantiteRevision : 1;
    if (checked) {
      newSelected.add(articleId);
      setArticleQuantities((prev) => ({ ...prev, [articleId]: prev[articleId] || qtyRevision }));
    } else {
      newSelected.delete(articleId);
      setArticleQuantities((prev) => {
        const n = { ...prev }; delete n[articleId]; return n;
      });
    }
    setSelectedArticles(newSelected);
  };

  const handleQuantityChange = (articleId: string, quantity: number) => {
    setArticleQuantities((prev) => ({ ...prev, [articleId]: quantity }));
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
      const articlesAvecStock = [];
      for (const articleId of selectedArticles) {
        const article = articlesCompatibles.find((a) => a.id === articleId);
        const quantity = articleQuantities[articleId] || 1;
        if (!article) throw new Error(`Article non trouvé: ${articleId}`);
        if (article.stock <= 0) throw new Error(`L'article "${article.designation}" est en rupture de stock`);
        if (article.stock < quantity) throw new Error(`Stock insuffisant pour "${article.designation}". Stock: ${article.stock}, demandé: ${quantity}`);
        articlesAvecStock.push({ articleId, article, quantity });
      }
      const mouvements = articlesAvecStock.map(({ articleId, quantity }) => ({
        article_id: articleId,
        type: "sortie",
        motif: "révision",
        quantity,
        user_id: user.id,
        vehicule_id: selectedGroup?.vehicules[0]?.id || null,
      }));
      const { error } = await supabase.from("stock_movements").insert(mouvements);
      if (error) throw error;
      for (const { articleId, quantity } of articlesAvecStock) {
        await supabase.rpc("update_article_stock", { article_id: articleId, quantity_change: -quantity });
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
    },
  });

  const generateCommande = async () => {
    if (!selectedGroup || !articlesCompatibles.length) return;
    const piecesACommander = articlesCompatibles
      .map((article) => ({ article, analyse: analyseStock(article, typeof quantiteRevision === "number" ? quantiteRevision : 1) }))
      .filter(({ analyse }) => analyse.manquant > 0);

    if (piecesACommander.length === 0) {
      toast.info("Toutes les pièces sont disponibles en stock");
      return;
    }
    try {
      const articleIds = piecesACommander.map(({ article }) => article.id);
      const { data: afList } = await supabase
        .from("article_fournisseurs")
        .select("article_id, fournisseur_id, prix_fournisseur, est_principal, actif")
        .in("article_id", articleIds).eq("actif", true);

      const fournisseurIdsSet = new Set<string>();
      afList?.forEach((af) => fournisseurIdsSet.add(af.fournisseur_id));
      piecesACommander.forEach(({ article }) => { if (article.fournisseur_id) fournisseurIdsSet.add(article.fournisseur_id); });
      if (fournisseurIdsSet.size === 0) { toast.error("Aucun fournisseur trouvé pour ces articles"); return; }

      const { data: fournisseurs } = await supabase
        .from("fournisseurs").select("id, nom, email, telephone, adresse, actif")
        .in("id", Array.from(fournisseurIdsSet)).eq("actif", true);

      const fournisseursMap = new Map((fournisseurs || []).map((f) => [f.id, f]));
      const grouped: Record<string, any> = {};

      for (const { article, analyse } of piecesACommander) {
        const articleFournisseurs = afList?.filter((af) => af.article_id === article.id) || [];
        let bestFournisseur = articleFournisseurs.find((af) => af.est_principal) || articleFournisseurs[0];
        let fournisseur, prixFournisseur;
        if (bestFournisseur) {
          fournisseur = fournisseursMap.get(bestFournisseur.fournisseur_id);
          prixFournisseur = bestFournisseur.prix_fournisseur;
        } else if (article.fournisseur_id) {
          fournisseur = fournisseursMap.get(article.fournisseur_id);
        }
        if (!fournisseur) continue;
        const fid = fournisseur.id;
        if (!grouped[fid]) grouped[fid] = { fournisseur, items: [], total_ht: 0, total_ttc: 0 };
        const prixUnitaire = prixFournisseur || article.prix_achat || 0;
        const totalLigne = analyse.manquant * prixUnitaire;
        grouped[fid].items.push({
          article_id: article.id, designation: article.designation, reference: article.reference,
          quantite_commandee: analyse.manquant, prix_unitaire: prixUnitaire, total_ligne: totalLigne,
        });
        grouped[fid].total_ht += totalLigne;
        grouped[fid].total_ttc = grouped[fid].total_ht * 1.2;
      }
      if (Object.keys(grouped).length === 0) { toast.error("Impossible de grouper les articles par fournisseur"); return; }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const createdCommandeIds: string[] = [];
      for (const [, orderData] of Object.entries(grouped)) {
        const { data: commande, error: commandeError } = await supabase
          .from("commandes").insert([{
            fournisseur: orderData.fournisseur.nom,
            email_fournisseur: orderData.fournisseur.email,
            telephone_fournisseur: orderData.fournisseur.telephone,
            adresse_fournisseur: orderData.fournisseur.adresse,
            status: "brouillon", total_ht: orderData.total_ht, total_ttc: orderData.total_ttc,
            tva_taux: 20, user_id: currentUser?.id, numero_commande: "",
          }]).select().single();
        if (commandeError) throw commandeError;
        createdCommandeIds.push(commande.id);
        const itemsToInsert = orderData.items.map((item: any) => ({
          commande_id: commande.id, article_id: item.article_id, designation: item.designation,
          reference: item.reference, quantite_commandee: item.quantite_commandee, quantite_recue: 0,
          prix_unitaire: item.prix_unitaire, total_ligne: item.total_ligne,
        }));
        const { error: itemsError } = await supabase.from("commande_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
      toast.success(`${Object.keys(grouped).length} commande(s) créée(s) pour ${piecesACommander.length} pièces`);
      setTimeout(() => navigate("/commandes", { state: { openCommandeIds: createdCommandeIds }, replace: true }), 300);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  // ============= RENDER =============

  // ÉTAPE CATALOGUE (véhicule choisi)
  if (selectedGroup) {
    const qty = typeof quantiteRevision === "number" ? quantiteRevision : 1;
    const dispo = articlesCompatibles.filter((a) => analyseStock(a, qty).suffisant).length;
    const manquant = articlesCompatibles.length - dispo;

    return (
      <DashboardLayout>
        <div className="space-y-4 pb-32">
          {/* Véhicule épinglé (sticky) */}
          <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-3 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {selectedGroup.marque} {selectedGroup.modele}
                    {selectedGroup.motorisation && <span className="text-muted-foreground font-normal"> · {selectedGroup.motorisation}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    {!useNonRegisteredVehicle && <span>{selectedGroup.count} véhicule{selectedGroup.count > 1 ? "s" : ""} en flotte</span>}
                    {useNonRegisteredVehicle && <Badge variant="outline" className="text-[10px]">Non enregistré</Badge>}
                    <span>·</span>
                    <span>{articlesCompatibles.length} pièce{articlesCompatibles.length > 1 ? "s" : ""} compatible{articlesCompatibles.length > 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={resetWorkflow} className="flex-shrink-0">
                <X className="h-4 w-4 mr-1" />Changer
              </Button>
            </div>
          </div>

          {/* Quantité véhicules */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-primary" />
                  <Label htmlFor="qty-rev" className="font-medium">Véhicules à réviser</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9"
                    onClick={() => {
                      const cur = typeof quantiteRevision === "number" ? quantiteRevision : 1;
                      const next = Math.max(1, cur - 1);
                      setQuantiteRevision(next);
                      setArticleQuantities((prev) => {
                        const u = { ...prev }; selectedArticles.forEach((id) => (u[id] = next)); return u;
                      });
                    }}>−</Button>
                  <Input id="qty-rev" type="number" min={1} max={useNonRegisteredVehicle ? undefined : selectedGroup.count}
                    value={quantiteRevision}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setQuantiteRevision(""); return; }
                      const n = parseInt(v);
                      if (!isNaN(n) && n >= 1) {
                        setQuantiteRevision(n);
                        setArticleQuantities((prev) => {
                          const u = { ...prev }; selectedArticles.forEach((id) => (u[id] = n)); return u;
                        });
                      }
                    }}
                    onBlur={(e) => { if (e.target.value === "" || parseInt(e.target.value) < 1) setQuantiteRevision(1); }}
                    className="w-20 text-center" />
                  <Button variant="outline" size="icon" className="h-9 w-9"
                    onClick={() => {
                      const cur = typeof quantiteRevision === "number" ? quantiteRevision : 1;
                      const max = useNonRegisteredVehicle ? Infinity : selectedGroup.count;
                      const next = Math.min(max, cur + 1);
                      setQuantiteRevision(next);
                      setArticleQuantities((prev) => {
                        const u = { ...prev }; selectedArticles.forEach((id) => (u[id] = next)); return u;
                      });
                    }}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Catégories visuelles (style Oscaro) */}
          {categoriesGrouped.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Catégories</h2>
                {activeCategory && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" /> Tout afficher
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {categoriesGrouped.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.label;
                  return (
                    <button key={cat.label}
                      onClick={() => setActiveCategory(isActive ? null : cat.label)}
                      className={cn(
                        "group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                        isActive ? "bg-primary text-primary-foreground border-primary shadow-medium scale-[1.02]"
                                 : "bg-card hover:bg-accent hover:border-primary/40 hover:shadow-soft"
                      )}>
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        isActive ? "bg-primary-foreground/20" : "bg-primary/10 group-hover:bg-primary/20"
                      )}>
                        <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-primary")} />
                      </div>
                      <div className="text-xs font-medium leading-tight">{cat.label}</div>
                      <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] h-4 px-1.5">
                        {cat.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recherche + liste pièces */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher une pièce, référence..."
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="pl-9" />
              </div>

              {loadingArticles ? (
                <div className="text-center py-8 text-muted-foreground">Chargement des pièces...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {articlesCompatibles.length === 0
                    ? "Aucune pièce compatible avec ce véhicule. Liez des articles à ce véhicule depuis leur fiche."
                    : "Aucune pièce ne correspond à votre recherche"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredArticles.map((article) => {
                    const analyse = analyseStock(article, qty);
                    const isSelected = selectedArticles.has(article.id);
                    const meta = getCategoryMeta(article.categorie);
                    const Icon = meta.icon;
                    return (
                      <div key={article.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                        )}>
                        <Checkbox checked={isSelected}
                          onCheckedChange={(c) => handleArticleSelection(article.id, c as boolean)} />
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{article.designation}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="font-mono">{article.reference}</span>
                            <span>·</span>
                            <span>{article.marque}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-success/50 text-success">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Compatible
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <Input type="number" min={1} max={article.stock}
                              value={articleQuantities[article.id] || 1}
                              onChange={(e) => handleQuantityChange(article.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center text-sm" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {analyse.suffisant ? (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-success-light/50 text-success text-xs font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />{analyse.disponible}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-warning-light/50 text-warning text-xs font-medium">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {analyse.disponible}/{analyse.necessaire}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Résumé */}
          {articlesCompatibles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-success-light/30 border-success/30">
                <CardContent className="p-3 text-center">
                  <Package className="h-5 w-5 mx-auto mb-1 text-success" />
                  <div className="text-xl font-bold text-success">{dispo}</div>
                  <div className="text-[11px] text-success/80">Disponibles</div>
                </CardContent>
              </Card>
              <Card className="bg-warning-light/30 border-warning/30">
                <CardContent className="p-3 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <div className="text-xl font-bold text-warning">{manquant}</div>
                  <div className="text-[11px] text-warning/80">À commander</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-3 text-center">
                  <Wrench className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-xl font-bold text-primary">{qty}</div>
                  <div className="text-[11px] text-primary/80">Véhicule{qty > 1 ? "s" : ""}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer actions sticky */}
          {articlesCompatibles.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 md:left-56 z-30 bg-background/95 backdrop-blur border-t border-border p-3 shadow-large">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-2">
                <Button onClick={handleSortieStock} variant="outline" disabled={selectedArticles.size === 0} className="flex-1">
                  <Minus className="h-4 w-4 mr-2" />
                  Sortir {selectedArticles.size > 0 && `(${selectedArticles.size})`}
                </Button>
                <Button onClick={generateCommande} className="flex-1" disabled={manquant === 0}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Commander les manquants {manquant > 0 && `(${manquant})`}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog confirmation sortie */}
        <Dialog open={showSortieDialog} onOpenChange={setShowSortieDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Confirmer la Sortie de Stock - Révision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-medium">
                  {selectedGroup?.marque} {selectedGroup?.modele}
                  {selectedGroup?.motorisation && ` (${selectedGroup.motorisation})`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Motif : Révision · {selectedArticles.size} article{selectedArticles.size > 1 ? "s" : ""}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Array.from(selectedArticles).map((articleId) => {
                  const article = articlesCompatibles.find((a) => a.id === articleId);
                  const quantity = articleQuantities[articleId] || 1;
                  if (!article) return null;
                  return (
                    <div key={articleId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{article.designation}</div>
                        <div className="text-xs text-muted-foreground">{article.reference} · {article.marque}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div>Qté : {quantity}</div>
                        <div className="text-xs text-muted-foreground">Stock : {article.stock}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSortieDialog(false)} className="flex-1">Annuler</Button>
                <Button onClick={() => sortieStockMutation.mutate()} disabled={sortieStockMutation.isPending} className="flex-1">
                  {sortieStockMutation.isPending ? "Traitement..." : "Confirmer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // ============= ÉTAPE ENTONNOIR =============
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Révisions véhicules</h1>
            <p className="text-sm text-muted-foreground">Sélectionnez un véhicule pour préparer la révision</p>
          </div>
        </div>

        {/* Breadcrumb workflow */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <button onClick={() => { setStepMarque(null); setStepModele(null); }}
            className={cn("font-medium hover:text-primary transition-colors", !stepMarque && "text-primary")}>
            1. Marque
          </button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setStepModele(null)} disabled={!stepMarque}
            className={cn("font-medium hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              stepMarque && !stepModele && "text-primary")}>
            2. Modèle
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className={cn("font-medium", stepMarque && stepModele && "text-primary")}>3. Motorisation</span>
        </div>

        {/* Étape 1 : marques */}
        {!stepMarque && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Marques disponibles ({marques.length})
              </h2>
              {marques.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  Aucun véhicule actif enregistré
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {marques.map(([marque, count]) => (
                    <button key={marque} onClick={() => setStepMarque(marque)}
                      className="group p-4 rounded-xl border bg-card hover:border-primary hover:shadow-medium transition-all text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-5 w-5 text-primary" />
                        <Badge variant="outline" className="ml-auto text-[10px]">{count}</Badge>
                      </div>
                      <div className="font-semibold">{marque}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {count} véhicule{count > 1 ? "s" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Véhicule non enregistré */}
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Véhicule non enregistré ?</div>
                    <div className="text-xs text-muted-foreground">Saisissez un véhicule ponctuel</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNonRegisteredDialog(true)}>
                  Saisir manuellement
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Étape 2 : modèles */}
        {stepMarque && !stepModele && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStepMarque(null)} className="mb-3">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux marques
            </Button>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Modèles {stepMarque} ({modeles.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {modeles.map(([modele, count]) => (
                <button key={modele} onClick={() => setStepModele(modele)}
                  className="group p-4 rounded-xl border bg-card hover:border-primary hover:shadow-medium transition-all text-left">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-muted-foreground">{stepMarque}</div>
                    <Badge variant="outline" className="text-[10px]">{count}</Badge>
                  </div>
                  <div className="font-semibold">{modele}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    Voir motorisations <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 3 : motorisations */}
        {stepMarque && stepModele && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setStepModele(null)} className="mb-3">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux modèles
            </Button>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Motorisations {stepMarque} {stepModele}
            </h2>
            <div className="space-y-2">
              {motorisations.map((group, idx) => (
                <button key={idx} onClick={() => pickGroup(group)}
                  className="w-full p-4 rounded-xl border bg-card hover:border-primary hover:shadow-medium transition-all flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Cog className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {group.motorisation || "Motorisation non précisée"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.marque} {group.modele} · {group.count} véhicule{group.count > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline">{group.count}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dialog véhicule non enregistré */}
        <Dialog open={showNonRegisteredDialog} onOpenChange={setShowNonRegisteredDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Véhicule non enregistré</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="marque-nr">Marque *</Label>
                <Input id="marque-nr" value={nonRegisteredVehicle.marque}
                  onChange={(e) => setNonRegisteredVehicle((p) => ({ ...p, marque: e.target.value }))}
                  placeholder="Peugeot, Renault..." />
              </div>
              <div>
                <Label htmlFor="modele-nr">Modèle *</Label>
                <Input id="modele-nr" value={nonRegisteredVehicle.modele}
                  onChange={(e) => setNonRegisteredVehicle((p) => ({ ...p, modele: e.target.value }))}
                  placeholder="208, Clio..." />
              </div>
              <div>
                <Label htmlFor="moto-nr">Motorisation</Label>
                <Input id="moto-nr" value={nonRegisteredVehicle.motorisation}
                  onChange={(e) => setNonRegisteredVehicle((p) => ({ ...p, motorisation: e.target.value }))}
                  placeholder="1.0 TCe 91 cv..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNonRegisteredDialog(false)} className="flex-1">Annuler</Button>
                <Button onClick={handleNonRegisteredVehicleRevision} className="flex-1">
                  <Wrench className="h-4 w-4 mr-2" /> Analyser
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
