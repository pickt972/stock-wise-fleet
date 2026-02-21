import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft, ArrowRight, Check, Edit, Plus, Trash2,
  Layers, Package, Hash, Tag, MapPin, Truck,
  Battery, Disc, Droplets, Zap, Cog, CircleDot, Car, Wrench, Boxes,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import ArticleVehicleCompatibility from "./ArticleVehicleCompatibility";
import { ArticleEmplacementsList } from "./ArticleEmplacementsList";


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
  fournisseur_id?: string;
}

interface EditArticleDialogProps {
  article: Article;
  onArticleUpdated: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Batteries": <Battery className="h-6 w-6" />,
  "Freinage": <Disc className="h-6 w-6" />,
  "Filtration": <Droplets className="h-6 w-6" />,
  "Électrique": <Zap className="h-6 w-6" />,
  "Moteur": <Cog className="h-6 w-6" />,
  "Transmission": <CircleDot className="h-6 w-6" />,
  "Pneumatiques": <Car className="h-6 w-6" />,
  "Carrosserie": <Wrench className="h-6 w-6" />,
  "Consommables": <Boxes className="h-6 w-6" />,
};

function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] || <Tag className="h-6 w-6" />;
}

export function EditArticleDialog({ article, onArticleUpdated }: EditArticleDialogProps) {
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Total steps: 1=Cat+Designation, 2=Ref+Marque, 3=Fournisseur, 4=Emplacement, 5=Stock+Prix, 6=Compatibilité, 7=Récapitulatif
  const totalSteps = 7;
  

  // Data lists
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategoriesData, setAllCategoriesData] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; nom: string }[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);

  // Subcategory CRUD
  const [showSubcategorieDialog, setShowSubcategorieDialog] = useState(false);
  const [newSubcategorieName, setNewSubcategorieName] = useState("");
  const [editingSubcategorie, setEditingSubcategorie] = useState<{ id: string; nom: string } | null>(null);
  const [editSubcategorieName, setEditSubcategorieName] = useState("");

  // Price
  const [priceType, setPriceType] = useState<"HT" | "TTC">("HT");
  const [tvaTaux, setTvaTaux] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    reference: article.reference,
    designation: article.designation,
    marque: article.marque,
    categorie: article.categorie,
    stock: article.stock,
    stock_min: article.stock_min,
    stock_max: article.stock_max,
    prix_achat: article.prix_achat,
    emplacement: article.emplacement || "",
    fournisseur_id: article.fournisseur_id || "none",
  });

  useEffect(() => {
    setFormData({
      reference: article.reference,
      designation: article.designation,
      marque: article.marque,
      categorie: article.categorie,
      stock: article.stock,
      stock_min: article.stock_min,
      stock_max: article.stock_max,
      prix_achat: article.prix_achat,
      emplacement: article.emplacement || "",
      fournisseur_id: article.fournisseur_id || "none",
    });
  }, [article]);

  useEffect(() => {
    fetchFournisseurs();
    fetchEmplacements();
    loadCategories();
  }, []);

  useEffect(() => {
    if (formData.categorie && allCategoriesData.length > 0) {
      const parent = allCategoriesData.find(c => c.nom === formData.categorie && !c.parent_id);
      if (parent) {
        const subs = allCategoriesData.filter(c => c.parent_id === parent.id).map(c => ({ id: c.id, nom: c.nom }));
        setSubcategories(subs);
      } else {
        setSubcategories([]);
      }
    } else {
      setSubcategories([]);
    }
  }, [formData.categorie, allCategoriesData]);

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase.from('fournisseurs').select('id, nom').eq('actif', true).order('nom');
      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
    }
  };

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase.from('emplacements').select('id, nom').eq('actif', true).order('nom');
      if (error) throw error;
      setEmplacements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emplacements:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('id, nom, parent_id').eq('actif', true).order('nom');
      if (error) throw error;
      const allData = data || [];
      setAllCategoriesData(allData);
      const parents = allData.filter(c => !c.parent_id).map(c => c.nom);
      setCategories(parents.length > 0 ? parents : allData.map(c => c.nom));
    } catch {
      setCategories([]);
    }
  };

  const handleCreateSubcategorie = async () => {
    if (!newSubcategorieName.trim()) return;
    try {
      const parent = allCategoriesData.find(c => c.nom === formData.categorie && !c.parent_id);
      if (!parent) return;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("categories")
        .insert([{ nom: newSubcategorieName.trim(), parent_id: parent.id, actif: true, user_id: userData?.user?.id }])
        .select("id, nom, parent_id")
        .single();
      if (error) throw error;
      toast({ title: "Sous-catégorie créée ✓" });
      setAllCategoriesData(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, designation: data.nom }));
      setNewSubcategorieName("");
      setShowSubcategorieDialog(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de créer", variant: "destructive" });
    }
  };

  const handleEditSubcategorie = async () => {
    if (!editingSubcategorie || !editSubcategorieName.trim()) return;
    try {
      const { error } = await supabase.from("categories").update({ nom: editSubcategorieName.trim() }).eq("id", editingSubcategorie.id);
      if (error) throw error;
      toast({ title: "Sous-catégorie modifiée ✓" });
      setAllCategoriesData(prev => prev.map(c => c.id === editingSubcategorie.id ? { ...c, nom: editSubcategorieName.trim() } : c));
      if (formData.designation === editingSubcategorie.nom) setFormData(prev => ({ ...prev, designation: editSubcategorieName.trim() }));
      setEditingSubcategorie(null);
      setEditSubcategorieName("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de modifier", variant: "destructive" });
    }
  };

  const handleDeleteSubcategorie = async (subId: string, subNom: string) => {
    try {
      const { error } = await supabase.from("categories").update({ actif: false }).eq("id", subId);
      if (error) throw error;
      toast({ title: "Sous-catégorie supprimée ✓" });
      setAllCategoriesData(prev => prev.filter(c => c.id !== subId));
      if (formData.designation === subNom) setFormData(prev => ({ ...prev, designation: "" }));
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de supprimer", variant: "destructive" });
    }
  };

  const canProceed = useCallback(() => {
    switch (step) {
      case 1: return formData.categorie.trim() !== "" && formData.designation.trim() !== "";
      case 2: return formData.reference.trim() !== "" && formData.marque.trim() !== "";
      case 3: return true; // fournisseur optional
      case 4: return true; // emplacement optional
      case 5: return true;
      case 6: return true;
      case 7: return true;
      default: return false;
    }
  }, [step, formData]);

  const handleClose = () => {
    setOpen(false);
    onArticleUpdated();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updateData: any = {
        reference: formData.reference,
        designation: formData.designation,
        marque: formData.marque,
        categorie: formData.categorie,
        stock_min: formData.stock_min,
        stock_max: formData.stock_max,
        prix_achat: formData.prix_achat,
        emplacement: formData.emplacement,
        fournisseur_id: formData.fournisseur_id === "none" ? null : formData.fournisseur_id,
      };
      const { error } = await supabase.from('articles').update(updateData).eq('id', article.id);
      if (error) throw error;

      if (isAdmin() && formData.stock !== article.stock) {
        const delta = (formData.stock ?? 0) - (article.stock ?? 0);
        if (delta !== 0) {
          const { error: stockError } = await supabase.rpc('update_article_stock', {
            article_id: article.id,
            quantity_change: delta,
          });
          if (stockError) throw stockError;
        }
      }

      toast({ title: "Article modifié", description: "L'article a été modifié avec succès" });
      handleClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de modifier l'article", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const stepLabels = ["Catégorie", "Identification", "Fournisseur", "Emplacement", "Stock & Prix", "Compatibilité", "Récapitulatif"];

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[640px] sm:w-full rounded-lg max-h-[95dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-xl">Modifier l'article</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Étape {step}/{totalSteps} — {stepLabels[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="text-center text-sm text-muted-foreground">
          Étape {step} sur {totalSteps}
        </div>

        {/* Step 1: Catégorie + Sous-catégorie/Désignation */}
        {step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Catégorie & Désignation</h2>
                <p className="text-sm text-muted-foreground">Type et description de l'article</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Catégorie *</Label>
              <div className="flex flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setFormData({ ...formData, categorie: cat }); setStep(2); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.categorie === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory / Designation */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Sous-catégorie / Désignation</Label>
              {subcategories.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                        formData.designation === sub.nom ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                      }`}
                      onClick={() => { setFormData({ ...formData, designation: sub.nom }); setStep(2); }}
                    >
                      <span className="font-medium">{sub.nom}</span>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingSubcategorie(sub); setEditSubcategorieName(sub.nom); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteSubcategorie(sub.id, sub.nom); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {editingSubcategorie && (
                <div className="border border-border rounded-lg p-3 space-y-2 bg-card mb-2">
                  <Label className="text-xs">Modifier la sous-catégorie</Label>
                  <Input value={editSubcategorieName} onChange={(e) => setEditSubcategorieName(e.target.value)} className="h-9" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditSubcategorie(); } }} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setEditingSubcategorie(null); setEditSubcategorieName(""); }}>Annuler</Button>
                    <Button size="sm" onClick={handleEditSubcategorie} disabled={!editSubcategorieName.trim()}>Modifier</Button>
                  </div>
                </div>
              )}
              {showSubcategorieDialog && (
                <div className="border border-border rounded-lg p-3 space-y-2 bg-card mb-2">
                  <Label className="text-xs">Nouvelle sous-catégorie</Label>
                  <Input value={newSubcategorieName} onChange={(e) => setNewSubcategorieName(e.target.value)} placeholder="Ex: Plaquettes, Disques..." className="h-9" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateSubcategorie(); } }} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setShowSubcategorieDialog(false); setNewSubcategorieName(""); }}>Annuler</Button>
                    <Button size="sm" onClick={handleCreateSubcategorie} disabled={!newSubcategorieName.trim()}>Créer</Button>
                  </div>
                </div>
              )}
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
                placeholder="Désignation de l'article"
                className="h-11 text-base"
              />
            </div>
          </div>
        )}

        {/* Step 2: Référence + Marque */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Identification</h2>
                <p className="text-sm text-muted-foreground">Référence et marque</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Catégorie :</span>{" "}
                <span className="font-semibold">{formData.categorie}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Désignation :</span>{" "}
                <span className="font-semibold">{formData.designation}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Référence *</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
                className="h-11 text-base font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Marque *</Label>
              <Input
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                required
                className="h-11 text-base"
              />
            </div>
          </div>
        )}

        {/* Step 3: Fournisseur (auto-advance) */}
        {step === 3 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Fournisseur</h2>
                <p className="text-sm text-muted-foreground">Sélectionnez un fournisseur</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, fournisseur_id: "" }); setStep(4); }}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  !formData.fournisseur_id || formData.fournisseur_id === "none"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                Aucun fournisseur
              </button>
              {fournisseurs.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFormData({ ...formData, fournisseur_id: f.id }); setStep(4); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.fournisseur_id === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {f.nom}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Emplacement (auto-advance) */}
        {step === 4 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Emplacement</h2>
                <p className="text-sm text-muted-foreground">Où stocker cet article ?</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, emplacement: "none" }); setStep(5); }}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  !formData.emplacement || formData.emplacement === "none"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                Aucun emplacement
              </button>
              {emplacements.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setFormData({ ...formData, emplacement: e.nom }); setStep(5); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.emplacement === e.nom
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {e.nom}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Stock & Prix */}
        {step === 5 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Stock & Prix</h2>
                <p className="text-sm text-muted-foreground">Quantités et tarification</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Stock actuel</Label>
              <Input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                disabled={!isAdmin()}
                className={`h-11 text-base ${!isAdmin() ? 'bg-muted cursor-not-allowed' : ''}`}
              />
              {!isAdmin() && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Seuls les administrateurs peuvent modifier le stock initial
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Stock minimum</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_min}
                  onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Stock maximum</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_max}
                  onChange={(e) => setFormData({ ...formData, stock_max: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Type de prix</Label>
                <RadioGroup value={priceType} onValueChange={(val: "HT" | "TTC") => setPriceType(val)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="HT" id="edit-ht" />
                    <Label htmlFor="edit-ht" className="font-normal cursor-pointer">HT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TTC" id="edit-ttc" />
                    <Label htmlFor="edit-ttc" className="font-normal cursor-pointer">TTC</Label>
                  </div>
                </RadioGroup>
              </div>

              {priceType === "TTC" && (
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Taux de TVA (%)</Label>
                  <Select value={tvaTaux.toString()} onValueChange={(val) => setTvaTaux(parseFloat(val))}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-[60]">
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="8.5">8,5%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Prix d'achat {priceType} (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix_achat}
                  onChange={(e) => {
                    const inputPrice = parseFloat(e.target.value) || 0;
                    let prixHT = inputPrice;
                    if (priceType === "TTC" && tvaTaux > 0) {
                      prixHT = inputPrice / (1 + tvaTaux / 100);
                    }
                    setFormData({ ...formData, prix_achat: prixHT });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="h-11 text-base"
                />
                {priceType === "TTC" && tvaTaux > 0 && formData.prix_achat > 0 && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Prix HT : {formData.prix_achat.toFixed(2)} €
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Compatibilité véhicules & Emplacements */}
        {step === 6 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Compatibilité</h2>
                <p className="text-sm text-muted-foreground">Véhicules et emplacements associés</p>
              </div>
            </div>

            {/* Recap */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Article :</span>{" "}
                <span className="font-semibold">{formData.designation}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Réf :</span>{" "}
                <span className="font-mono font-semibold">{formData.reference}</span>
                {" · "}
                <span className="font-semibold">{formData.marque}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Stock :</span>{" "}
                <span className="font-semibold">{formData.stock} unités</span>
              </p>
            </div>

            <ArticleVehicleCompatibility articleId={article.id} />

            <ArticleEmplacementsList
              articleReference={article.reference}
              articleDesignation={article.designation}
              articleId={article.id}
            />
          </div>
        )}

        {/* Step 7: Récapitulatif */}
        {step === 7 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Récapitulatif</h2>
                <p className="text-sm text-muted-foreground">Vérifiez les modifications avant validation</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Catégorie</p>
                  <p className="font-semibold text-sm">{formData.categorie}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Désignation</p>
                  <p className="font-semibold text-sm">{formData.designation}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="font-semibold text-sm font-mono">{formData.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Marque</p>
                  <p className="font-semibold text-sm">{formData.marque}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fournisseur</p>
                  <p className="font-semibold text-sm">
                    {formData.fournisseur_id && formData.fournisseur_id !== "none"
                      ? fournisseurs.find(f => f.id === formData.fournisseur_id)?.nom || "—"
                      : "Aucun"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Emplacement</p>
                  <p className="font-semibold text-sm">{formData.emplacement && formData.emplacement !== "none" ? formData.emplacement : "Aucun"}</p>
                </div>
              </div>

              <div className="border-t border-border pt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-semibold text-sm">{formData.stock}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min</p>
                  <p className="font-semibold text-sm">{formData.stock_min}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max</p>
                  <p className="font-semibold text-sm">{formData.stock_max}</p>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Prix d'achat HT</p>
                <p className="font-semibold text-sm">{formData.prix_achat.toFixed(2)} €</p>
              </div>
            </div>

            {/* Change indicators */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modifications détectées</p>
              {(() => {
                const changes: { label: string; old: string; new: string }[] = [];
                if (article.categorie !== formData.categorie) changes.push({ label: "Catégorie", old: article.categorie, new: formData.categorie });
                if (article.designation !== formData.designation) changes.push({ label: "Désignation", old: article.designation, new: formData.designation });
                if (article.reference !== formData.reference) changes.push({ label: "Référence", old: article.reference, new: formData.reference });
                if (article.marque !== formData.marque) changes.push({ label: "Marque", old: article.marque, new: formData.marque });
                if (article.stock !== formData.stock) changes.push({ label: "Stock", old: String(article.stock), new: String(formData.stock) });
                if (article.stock_min !== formData.stock_min) changes.push({ label: "Stock min", old: String(article.stock_min), new: String(formData.stock_min) });
                if (article.stock_max !== formData.stock_max) changes.push({ label: "Stock max", old: String(article.stock_max), new: String(formData.stock_max) });
                if (article.prix_achat !== formData.prix_achat) changes.push({ label: "Prix", old: article.prix_achat.toFixed(2) + " €", new: formData.prix_achat.toFixed(2) + " €" });
                if ((article.emplacement || "") !== formData.emplacement) changes.push({ label: "Emplacement", old: article.emplacement || "Aucun", new: formData.emplacement || "Aucun" });

                if (changes.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">Aucune modification détectée</p>;
                }

                return changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-card border border-border rounded-lg px-3 py-2">
                    <span className="font-medium text-foreground">{c.label} :</span>
                    <span className="text-muted-foreground line-through">{c.old}</span>
                    <ArrowRight className="h-3 w-3 text-primary" />
                    <span className="text-primary font-semibold">{c.new}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
            className="flex-1 h-12 text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? "Annuler" : "Retour"}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className={`flex-1 h-12 text-base ${
              step === totalSteps ? "bg-success hover:bg-success/90 text-success-foreground" : ""
            }`}
          >
            {isLoading ? (
              "Modification..."
            ) : step === totalSteps ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Modifier l'article
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
