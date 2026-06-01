import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Plus, Package, Tag, Layers, Hash,
  MapPin, Truck, Battery, Wrench, Droplets, Disc, Zap, Cog, Car, CircleDot, Boxes, HelpCircle,
  Edit, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useArticleSuggestions } from "@/hooks/useArticleSuggestions";


interface ArticleCreationWizardProps {
  defaultCodeBarre?: string;
  defaultReference?: string;
  returnTo?: string;
}

// Map category names to icons
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

export function ArticleCreationWizard({
  defaultCodeBarre = "",
  defaultReference = "",
  returnTo = "/articles",
}: ArticleCreationWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useRoleAccess();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategoriesData, setAllCategoriesData] = useState<{ id: string; nom: string; parent_id: string | null }[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  

  const [showSubcategorieDialog, setShowSubcategorieDialog] = useState(false);
  const [newSubcategorieName, setNewSubcategorieName] = useState("");
  const [editingSubcategorie, setEditingSubcategorie] = useState<{ id: string; nom: string } | null>(null);
  const [editSubcategorieName, setEditSubcategorieName] = useState("");

  // Admin: new category inline
  const [showNewCategorieInput, setShowNewCategorieInput] = useState(false);
  const [newCategorieName, setNewCategorieName] = useState("");
  

  // Form data
  const [categorie, setCategorie] = useState("");
  const [designation, setDesignation] = useState("");
  const [reference, setReference] = useState(defaultReference || defaultCodeBarre || "");
  const [codeBarre] = useState(defaultCodeBarre || "");
  const [marque, setMarque] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [quantite, setQuantite] = useState(1);
  const { data: articleSuggestions } = useArticleSuggestions();

  // Sub-category tracking
  const [sousCategorieId, setSousCategorieId] = useState("");

  // Vehicle compatibility (optional, but systematically asked)
  const [vehiculesList, setVehiculesList] = useState<any[]>([]);
  const [selectedVehiculeGroups, setSelectedVehiculeGroups] = useState<string[]>([]);

  // Admin-only fields
  const [stockMin, setStockMin] = useState(0);
  const [stockMax, setStockMax] = useState(100);
  const [prixAchat, setPrixAchat] = useState(0);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Steps: 1=Cat, 2=Sub+Desc, 3=Ref+Brand, 4=Fourn, 5=Emplact, 6=Vehicules, 7=Qte, 8=Admin
  const totalSteps = isAdmin() ? 8 : 7;

  useEffect(() => {
    fetchCategories();
    fetchDesignations();
    fetchFournisseurs();
    fetchEmplacements();
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicules")
        .select("id, marque, modele, motorisation, immatriculation")
        .eq("actif", true)
        .order("marque");
      if (error) throw error;
      setVehiculesList(data || []);
    } catch {
      console.error("Erreur chargement véhicules");
    }
  };


  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, nom, parent_id")
        .eq("actif", true)
        .order("sort_order")
        .order("nom");
      if (error) throw error;
      setAllCategoriesData(data || []);
      // Parent categories only for step 1
      const parents = (data || []).filter(c => !c.parent_id).map(c => c.nom);
      setCategories(parents.length > 0 ? parents : data?.map((c) => c.nom) || []);
    } catch {
      setCategories(["Consommables", "Freinage", "Filtration", "Électrique", "Moteur", "Autre"]);
    }
  };

  const [allArticleDesignations, setAllArticleDesignations] = useState<{ designation: string; categorie: string }[]>([]);
  const fetchDesignations = async () => {
    try {
      const { data } = await supabase
        .from("articles")
        .select("designation, categorie")
        .order("designation");
      const unique = new Map<string, string>();
      data?.forEach((a) => { if (!unique.has(a.designation)) unique.set(a.designation, a.categorie); });
      setAllArticleDesignations(Array.from(unique, ([designation, categorie]) => ({ designation, categorie })));
    } catch {}
  };

  // Update subcategories when category changes
  useEffect(() => {
    if (categorie) {
      const parent = allCategoriesData.find(c => c.nom === categorie && !c.parent_id);
      if (parent) {
        const subs = allCategoriesData.filter(c => c.parent_id === parent.id).map(c => c.nom);
        setSubcategories(subs);
      } else {
        setSubcategories([]);
      }
    } else {
      setSubcategories([]);
    }
  }, [categorie, allCategoriesData]);

  const handleDesignationChange = (val: string) => {
    const formatted = val.replace(/\s+/g, " ");
    setDesignation(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    if (formatted.length >= 2) {
      const filtered = allArticleDesignations
        .filter((a) =>
          a.designation.toLowerCase().includes(formatted.toLowerCase()) &&
          (!categorie || a.categorie === categorie)
        )
        .map((a) => a.designation);
      setSuggestions(filtered.slice(0, 6));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from("fournisseurs")
        .select("id, nom")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      setFournisseurs(data || []);
    } catch {
      console.error("Erreur chargement fournisseurs");
    }
  };

  const handleCreateSubcategorie = async () => {
    if (!newSubcategorieName.trim()) return;
    try {
      const parent = allCategoriesData.find(c => c.nom === categorie && !c.parent_id);
      if (!parent) return;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("categories")
        .insert([{
          nom: newSubcategorieName.trim(),
          parent_id: parent.id,
          actif: true,
          user_id: userData?.user?.id,
        }])
        .select("id, nom, parent_id")
        .single();
      if (error) throw error;
      toast({ title: "Sous-catégorie créée ✓", description: newSubcategorieName.trim() });
      setAllCategoriesData(prev => [...prev, data]);
      setSousCategorieId(data.id);
      if (!designation.trim()) setDesignation(data.nom);
      setNewSubcategorieName("");
      setShowSubcategorieDialog(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de créer la sous-catégorie", variant: "destructive" });
    }
  };

  const handleCreateCategorie = async () => {
    if (!newCategorieName.trim()) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("categories")
        .insert([{
          nom: newCategorieName.trim(),
          parent_id: null,
          actif: true,
          user_id: userData?.user?.id,
        }])
        .select("id, nom, parent_id")
        .single();
      if (error) throw error;
      toast({ title: "Catégorie créée ✓", description: newCategorieName.trim() });
      setAllCategoriesData(prev => [...prev, data]);
      setCategories(prev => [...prev, data.nom]);
      setCategorie(data.nom);
      setNewCategorieName("");
      setShowNewCategorieInput(false);
      setStep(2);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de créer la catégorie", variant: "destructive" });
    }
  };

  const handleEditSubcategorie = async () => {
    if (!editingSubcategorie || !editSubcategorieName.trim()) return;
    try {
      const { error } = await supabase
        .from("categories")
        .update({ nom: editSubcategorieName.trim() })
        .eq("id", editingSubcategorie.id);
      if (error) throw error;
      toast({ title: "Sous-catégorie modifiée ✓" });
      setAllCategoriesData(prev => prev.map(c => c.id === editingSubcategorie.id ? { ...c, nom: editSubcategorieName.trim() } : c));
      if (designation === editingSubcategorie.nom) setDesignation(editSubcategorieName.trim());
      setEditingSubcategorie(null);
      setEditSubcategorieName("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de modifier", variant: "destructive" });
    }
  };

  const handleDeleteSubcategorie = async (subId: string, subNom: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ actif: false })
        .eq("id", subId);
      if (error) throw error;
      toast({ title: "Sous-catégorie supprimée ✓" });
      setAllCategoriesData(prev => prev.filter(c => c.id !== subId));
      if (designation === subNom) setDesignation("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de supprimer", variant: "destructive" });
    }
  };

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from("emplacements")
        .select("id, nom")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      setEmplacements(data || []);
    } catch {
      console.error("Erreur chargement emplacements");
    }
  };

  // Check if current category has any sub-categories
  const hasSubcategories = useCallback(() => {
    const parent = allCategoriesData.find(c => c.nom === categorie && !c.parent_id);
    if (!parent) return false;
    return allCategoriesData.some(c => c.parent_id === parent.id);
  }, [categorie, allCategoriesData]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return categorie.trim() !== "";
      case 2:
        // Require sub-category selection if any exist for this category
        if (hasSubcategories() && !sousCategorieId) return false;
        return designation.trim() !== "";
      case 3:
        return reference.trim() !== "" && marque.trim() !== "";
      case 4:
        return true; // fournisseur optional
      case 5:
        return true; // emplacement optional
      case 6:
        return true; // vehicle compatibility optional
      case 7:
        return quantite >= 0;
      case 8:
        return true;
      default:
        return false;
    }
  }, [step, categorie, designation, reference, marque, quantite, sousCategorieId, hasSubcategories]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: allArticles } = await supabase
        .from("articles")
        .select("id, reference, designation, marque");

      const normalizedRef = reference.trim().toLowerCase().replace(/\s+/g, "");
      const duplicate = allArticles?.find(
        (a) => a.reference.toLowerCase().replace(/\s+/g, "") === normalizedRef
      );
      if (duplicate) {
        toast({
          title: "Doublon détecté",
          description: `Un article avec la référence "${duplicate.reference}" existe déjà`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data: newArticle, error } = await supabase
        .from("articles")
        .insert([
          {
            reference: reference.trim(),
            designation: designation.trim(),
            marque: marque.trim(),
            categorie: categorie.trim(),
            code_barre: codeBarre || null,
            stock: quantite,
            stock_min: stockMin,
            stock_max: stockMax,
            prix_achat: prixAchat,
            emplacement_id: emplacementId || null,
            fournisseur_id: fournisseurId || null,
            user_id: userData?.user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (quantite > 0 && newArticle && userData?.user) {
        await supabase.from("stock_movements").insert({
          article_id: newArticle.id,
          type: "entree",
          quantity: quantite,
          motif: "Stock initial - création article",
          user_id: userData.user.id,
          created_by: userData.user.id,
        });
      }

      // Insert vehicle compatibilities (optional)
      if (newArticle && selectedVehiculeGroups.length > 0 && userData?.user) {
        const groupKey = (v: any) =>
          `${v.marque.trim().toLowerCase()}|${v.modele.trim().toLowerCase()}|${(v.motorisation ?? "").trim().toLowerCase()}`;
        const compatRows = vehiculesList
          .filter((v) => selectedVehiculeGroups.includes(groupKey(v)))
          .map((v) => ({
            article_id: newArticle.id,
            vehicule_id: v.id,
            user_id: userData.user.id,
          }));
        if (compatRows.length > 0) {
          await supabase.from("article_vehicules").insert(compatRows);
        }
      }

      toast({
        title: "Article créé ✓",
        description: `${designation} — ${quantite} unité(s) en stock`,
      });

      navigate(returnTo);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de créer l'article",
        variant: "destructive",
      });
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
    } else {
      navigate(returnTo);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-foreground">Nouvel article</h1>
        {codeBarre && (
          <p className="text-sm text-muted-foreground font-mono bg-muted/50 inline-block px-3 py-1 rounded-full">
            Code : {codeBarre}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="text-center text-sm text-muted-foreground">
        Étape {step} sur {totalSteps}
      </div>

      {/* Step 1: Catégorie (cards) + Description */}
      {step === 1 && (
        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Catégorie & Description</h2>
              <p className="text-sm text-muted-foreground">De quel type d'article s'agit-il ?</p>
            </div>
          </div>

          {/* Category cards grid */}
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setCategorie(cat); setStep(2); }}
                  className={`w-full text-left px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all ${
                    categorie === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* Admin: inline create category */}
              {isAdmin() && (
                showNewCategorieInput ? (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
                    <Label>Nouvelle catégorie</Label>
                    <Input
                      value={newCategorieName}
                      onChange={(e) => setNewCategorieName(e.target.value)}
                      placeholder="Ex: Accessoires, Climatisation..."
                      className="h-10"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCreateCategorie(); }
                      }}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setShowNewCategorieInput(false); setNewCategorieName(""); }}>
                        Annuler
                      </Button>
                      <Button size="sm" onClick={handleCreateCategorie} disabled={!newCategorieName.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Créer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewCategorieInput(true)}
                    className="w-full px-4 py-3.5 rounded-lg border-2 border-dashed border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50 transition-all text-left flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-base font-medium">Nouvelle catégorie</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Description with autocomplete */}
      {step === 2 && (
        <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Sous catégorie / Désignation</h2>
              <p className="text-sm text-muted-foreground">Précisez le type et décrivez l'article</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Catégorie :</span>{" "}
              <span className="font-semibold">{categorie}</span>
            </p>
          </div>

          {/* Subcategory dropdown */}
          <div className="space-y-2">
            <Label>
              Sous-catégorie {hasSubcategories() ? "*" : ""}
            </Label>
            {(() => {
              const parent = allCategoriesData.find(p => p.nom === categorie && !p.parent_id);
              const subs = parent ? allCategoriesData.filter(c => c.parent_id === parent.id) : [];
              const subcatOptions = [
                ...subs.map(s => ({ value: s.id, label: s.nom })),
                { value: "__new__", label: "＋ Nouvelle sous-catégorie" },
              ];
              return (
                <SearchableSelect
                  options={subcatOptions}
                  value={sousCategorieId}
                  onValueChange={(val) => {
                    if (val === "__new__") {
                      setShowSubcategorieDialog(true);
                    } else {
                      const sub = subs.find(s => s.id === val);
                      if (sub) {
                        setSousCategorieId(val);
                        if (!designation.trim()) setDesignation(sub.nom);
                        setShowSuggestions(false);
                      }
                    }
                  }}
                  placeholder="Sélectionner une sous-catégorie..."
                  searchPlaceholder="Rechercher une sous-catégorie..."
                  emptyMessage="Aucune sous-catégorie trouvée"
                />
              );
            })()}

            {/* Inline create subcategory */}
            {showSubcategorieDialog && (
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
                <Label>Nouvelle sous-catégorie</Label>
                <Input
                  value={newSubcategorieName}
                  onChange={(e) => setNewSubcategorieName(e.target.value)}
                  placeholder="Ex: Plaquettes, Disques..."
                  className="h-10"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleCreateSubcategorie(); }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setShowSubcategorieDialog(false); setNewSubcategorieName(""); }}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleCreateSubcategorie} disabled={!newSubcategorieName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Créer
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 relative">
            <Label>Désignation *</Label>
            <Input
              value={designation}
              onChange={(e) => handleDesignationChange(e.target.value)}
              onFocus={() => designation.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Ex: 60Amp, 5W30, Plaquettes avant..."
              className="h-12 text-base"
              autoFocus
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    onMouseDown={() => {
                      setDesignation(s);
                      setShowSuggestions(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Saisissez ou complétez la désignation (capacité, taille, type...)
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Référence + Marque */}
      {step === 3 && (
        <Card className="animate-in slide-in-from-right-4 duration-200">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Identification</h2>
                <p className="text-sm text-muted-foreground">Référence et marque</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Référence *</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value.trim().toUpperCase())}
                placeholder="Ex: HM-530, BAT-60A..."
                className="h-12 text-base font-mono"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Marque *</Label>
              <AutocompleteInput
                value={marque}
                onValueChange={(val) => {
                  const v = val.replace(/\s+/g, " ");
                  setMarque(v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
                }}
                suggestions={articleSuggestions?.marques ?? []}
                placeholder="Ex: Bosch, Varta, Mann..."
                inputClassName="h-12 text-base"
              />
            </div>

            {codeBarre && codeBarre !== reference && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Code-barre scanné : <span className="font-mono font-semibold">{codeBarre}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Fournisseur (auto-advance) */}
      {step === 4 && (
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
              onClick={() => { setFournisseurId(""); setStep(5); }}
              className={`w-full text-left px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all ${
                fournisseurId === ""
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
                onClick={() => { setFournisseurId(f.id); setStep(5); }}
                className={`w-full text-left px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all ${
                  fournisseurId === f.id
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

      {/* Step 5: Emplacement (auto-advance) */}
      {step === 5 && (
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
              onClick={() => { setEmplacementId(""); setStep(6); }}
              className={`w-full text-left px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all ${
                emplacementId === ""
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
                onClick={() => { setEmplacementId(e.id); setStep(6); }}
                className={`w-full text-left px-4 py-3.5 rounded-lg border-2 text-base font-medium transition-all ${
                  emplacementId === e.id
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

      {/* Step 6: Compatibilité véhicule (optionnel) */}
      {step === 6 && (() => {
        const groupKey = (v: any) =>
          `${v.marque.trim().toLowerCase()}|${v.modele.trim().toLowerCase()}|${(v.motorisation ?? "").trim().toLowerCase()}`;
        const groupLabel = (v: any) =>
          `${v.marque} ${v.modele}${v.motorisation ? ` (${v.motorisation})` : ""}`;
        const groupsMap = new Map<string, { key: string; label: string; count: number }>();
        vehiculesList.forEach((v) => {
          const k = groupKey(v);
          const existing = groupsMap.get(k);
          if (existing) existing.count += 1;
          else groupsMap.set(k, { key: k, label: groupLabel(v), count: 1 });
        });
        const groups = Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
        const toggleGroup = (k: string) => {
          setSelectedVehiculeGroups((prev) =>
            prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
          );
        };
        return (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Compatibilité véhicule</h2>
                <p className="text-sm text-muted-foreground">Optionnel — sélectionnez les modèles compatibles</p>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
                Aucun véhicule disponible. Vous pourrez en ajouter plus tard depuis la fiche article.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {groups.map((g) => {
                  const selected = selectedVehiculeGroups.includes(g.key);
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex-1 min-w-0 truncate">{g.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {g.count} véh.{selected ? " ✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedVehiculeGroups.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {selectedVehiculeGroups.length} modèle(s) sélectionné(s)
              </p>
            )}
          </div>
        );
      })()}

      {/* Step 7: Quantité */}
      {step === 7 && (
        <Card className="animate-in slide-in-from-right-4 duration-200">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Quantité initiale</h2>
                <p className="text-sm text-muted-foreground">Combien d'unités à enregistrer ?</p>
              </div>
            </div>

            {/* Recap */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Catégorie :</span>{" "}
                <span className="font-semibold">{categorie}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Article :</span>{" "}
                <span className="font-semibold">{designation}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Réf :</span>{" "}
                <span className="font-mono font-semibold">{reference}</span>
                {" · "}
                <span className="font-semibold">{marque}</span>
              </p>
              {fournisseurs.find((f) => f.id === fournisseurId) && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Fournisseur :</span>{" "}
                  <span className="font-semibold">
                    {fournisseurs.find((f) => f.id === fournisseurId)?.nom}
                  </span>
                </p>
              )}
              {emplacements.find((e) => e.id === emplacementId) && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Emplacement :</span>{" "}
                  <span className="font-semibold">
                    {emplacements.find((e) => e.id === emplacementId)?.nom}
                  </span>
                </p>
              )}
            </div>

            {/* Big quantity controls */}
            <div className="flex items-center justify-center gap-4 py-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-xl"
                onClick={() => setQuantite(Math.max(0, quantite - 1))}
                disabled={quantite <= 0}
              >
                <span className="text-2xl">−</span>
              </Button>
              <Input
                type="number"
                min={0}
                value={quantite}
                onChange={(e) => setQuantite(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 h-16 text-center text-3xl font-bold border-2"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-xl"
                onClick={() => setQuantite(quantite + 1)}
              >
                <span className="text-2xl">+</span>
              </Button>
            </div>

            {/* Quick quantity buttons */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 5, 10].map((n) => (
                <Button
                  key={n}
                  variant={quantite === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuantite(n)}
                  className="min-w-[40px]"
                >
                  {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 8: Admin only - Advanced settings */}
      {step === 8 && isAdmin() && (
        <Card className="animate-in slide-in-from-right-4 duration-200">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Paramètres avancés</h2>
                <p className="text-sm text-muted-foreground">Seuils d'alerte et prix (admin)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock minimum</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockMin}
                  onChange={(e) => setStockMin(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock maximum</Label>
                <Input
                  type="number"
                  min={1}
                  value={stockMax}
                  onChange={(e) => setStockMax(parseInt(e.target.value) || 100)}
                  onFocus={(e) => e.target.select()}
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prix d'achat HT (€)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={prixAchat}
                onChange={(e) => setPrixAchat(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 h-14 text-base"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {step === 1 ? "Annuler" : "Retour"}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed() || isLoading}
          className={`flex-1 h-14 text-base ${
            step === totalSteps
              ? "bg-success hover:bg-success/90 text-success-foreground"
              : ""
          }`}
        >
          {isLoading ? (
            "Création..."
          ) : step === totalSteps ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Créer l'article
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>

    </div>
  );
}
