import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Plus, Package, Tag, Layers, Hash,
  MapPin, Truck, Battery, Wrench, Droplets, Disc, Zap, Cog, Car, CircleDot, Boxes, HelpCircle
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
import { CreateCategorieDialog } from "@/components/categories/CreateCategorieDialog";
import { CreateFournisseurDialog } from "@/components/fournisseurs/CreateFournisseurDialog";

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
  const [showCategorieDialog, setShowCategorieDialog] = useState(false);
  const [showSubcategorieDialog, setShowSubcategorieDialog] = useState(false);
  const [newSubcategorieName, setNewSubcategorieName] = useState("");
  const [showFournisseurDialog, setShowFournisseurDialog] = useState(false);

  // Form data
  const [categorie, setCategorie] = useState("");
  const [designation, setDesignation] = useState("");
  const [reference, setReference] = useState(defaultReference || defaultCodeBarre || "");
  const [codeBarre] = useState(defaultCodeBarre || "");
  const [marque, setMarque] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [emplacementId, setEmplacementId] = useState("");
  const [quantite, setQuantite] = useState(1);

  // Admin-only fields
  const [stockMin, setStockMin] = useState(0);
  const [stockMax, setStockMax] = useState(100);
  const [prixAchat, setPrixAchat] = useState(0);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Steps: 1=Category, 2=Description, 3=Ref+Brand+Supplier+Location, 4=Quantity, 5=Admin advanced
  const totalSteps = isAdmin() ? 5 : 4;

  useEffect(() => {
    fetchCategories();
    fetchDesignations();
    fetchFournisseurs();
    fetchEmplacements();
  }, []);

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
      setDesignation(data.nom);
      setNewSubcategorieName("");
      setShowSubcategorieDialog(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de créer la sous-catégorie", variant: "destructive" });
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

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return categorie.trim() !== "";
      case 2:
        return designation.trim() !== "";
      case 3:
        return reference.trim() !== "" && marque.trim() !== "";
      case 4:
        return quantite >= 0;
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, categorie, designation, reference, marque, quantite]);

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
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? "w-10 bg-primary"
                : s < step
                ? "w-6 bg-primary/40"
                : "w-6 bg-muted"
            }`}
          />
        ))}
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
          <div>
            <Label className="mb-2 block">Catégorie *</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategorie(cat)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 min-h-[80px] justify-center
                    ${
                      categorie === cat
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                    }`}
                >
                  {getCategoryIcon(cat)}
                  <span className="text-xs font-medium text-center leading-tight">{cat}</span>
                </button>
              ))}
              {/* Add new category button */}
              <button
                type="button"
                onClick={() => setShowCategorieDialog(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30 transition-all duration-150 min-h-[80px] justify-center"
              >
                <Plus className="h-6 w-6" />
                <span className="text-xs font-medium">Ajouter</span>
              </button>
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
            <div className="flex items-center justify-between">
              <Label>Sous-catégorie</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowSubcategorieDialog(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Nouvelle
              </Button>
            </div>
            {subcategories.length > 0 ? (
              <Select
                value={designation}
                onValueChange={(val) => {
                  setDesignation(val);
                  setShowSuggestions(false);
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Sélectionner une sous-catégorie..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px]">
                  {subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucune sous-catégorie — cliquez « Nouvelle » pour en créer</p>
            )}

            {/* Inline create subcategory */}
            {showSubcategorieDialog && (
              <div className="border border-border rounded-lg p-3 space-y-3 bg-card">
                <Label>Nom de la sous-catégorie</Label>
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
                    Créer
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

      {/* Step 3: Référence + Marque + Fournisseur + Emplacement */}
      {step === 3 && (
        <Card className="animate-in slide-in-from-right-4 duration-200">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Identification</h2>
                <p className="text-sm text-muted-foreground">Référence, marque et localisation</p>
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
              <Input
                value={marque}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s+/g, " ");
                  setMarque(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                }}
                placeholder="Ex: Bosch, Varta, Mann..."
                className="h-12 text-base"
              />
            </div>

            {/* Fournisseur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Fournisseur
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowFournisseurDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Nouveau
                </Button>
              </div>
              <Select
                value={fournisseurId}
                onValueChange={(val) => setFournisseurId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Aucun fournisseur" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px]">
                  <SelectItem value="none">Aucun fournisseur</SelectItem>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Emplacement */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Emplacement
              </Label>
              <Select
                value={emplacementId}
                onValueChange={(val) => setEmplacementId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Aucun emplacement" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px]">
                  <SelectItem value="none">Aucun emplacement</SelectItem>
                  {emplacements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Step 4: Quantité */}
      {step === 4 && (
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

      {/* Step 5: Admin only - Advanced settings */}
      {step === 5 && isAdmin() && (
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

      <CreateCategorieDialog
        open={showCategorieDialog}
        onOpenChange={setShowCategorieDialog}
        onCategorieCreated={(nom) => {
          fetchCategories();
          setCategorie(nom);
        }}
      />

      <CreateFournisseurDialog
        open={showFournisseurDialog}
        onOpenChange={setShowFournisseurDialog}
        onFournisseurCreated={(id) => {
          fetchFournisseurs();
          setFournisseurId(id);
        }}
      />
    </div>
  );
}
