import { useState, useEffect } from "react";
import { Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { CreateFournisseurDialog } from "@/components/fournisseurs/CreateFournisseurDialog";
import { CreateCategorieDialog } from "@/components/categories/CreateCategorieDialog";
import { CreateVehiculeDialog } from "@/components/vehicules/CreateVehiculeDialog";
import { z } from "zod";
interface CreateArticleDialogProps {
  onArticleCreated: () => void;
  triggerButton?: React.ReactNode;
  defaultFournisseurId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateArticleDialog({ 
  onArticleCreated, 
  triggerButton, 
  defaultFournisseurId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange 
}: CreateArticleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [showFournisseurDialog, setShowFournisseurDialog] = useState(false);
  const [showCategorieDialog, setShowCategorieDialog] = useState(false);
  const [showVehiculeDialog, setShowVehiculeDialog] = useState(false);
  const [priceType, setPriceType] = useState<"HT" | "TTC">("HT");
  const [tvaTaux, setTvaTaux] = useState(0);
  const [formData, setFormData] = useState({
    reference: "",
    designation: "",
    marque: "",
    categorie: "",
    stock: 0,
    stockMin: 0,
    stockMax: 100,
    prixAchat: 0,
    emplacementId: "",
    fournisseurId: "",
  });
  const [selectedVehicules, setSelectedVehicules] = useState<string[]>([]);

const { toast } = useToast();

const articleSchema = z.object({
  reference: z.string().trim().min(1, { message: "Référence requise" }),
  designation: z.string().trim().min(1, { message: "Désignation requise" }),
  marque: z.string().trim().min(1, { message: "Marque requise" }),
  categorie: z.string().trim().min(1, { message: "Catégorie requise" }),
  stock: z.number().int().min(0),
  stockMin: z.number().int().min(0),
  stockMax: z.number().int().min(1),
  prixAchat: z.number().min(0),
  emplacementId: z.string().uuid().optional().or(z.literal("")),
  fournisseurId: z.string().uuid().optional().or(z.literal("")),
});

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
    }
  };

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('emplacements')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setEmplacements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emplacements:', error);
    }
  };

  const fetchVehicules = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicules')
        .select('id, immatriculation, marque, modele')
        .eq('actif', true)
        .order('immatriculation');

      if (error) throw error;
      setVehicules(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFournisseurs();
      fetchCategories();
      fetchEmplacements();
      fetchVehicules();
      
      // Pré-remplir le fournisseur si fourni
      if (defaultFournisseurId) {
        setFormData(prev => ({ ...prev, fournisseurId: defaultFournisseurId }));
      }
    }
  }, [open, defaultFournisseurId]);

  const [categories, setCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setCategories(data?.map(cat => cat.nom) || []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      // Fallback vers les catégories par défaut
      setCategories([
        "Consommables",
        "Freinage", 
        "Filtration",
        "Électrique",
        "Moteur",
        "Transmission",
        "Pneumatiques",
        "Carrosserie",
        "Autre"
      ]);
    }
  };

  const handleScanResult = (scannedCode: string) => {
    setFormData(prev => ({ ...prev, reference: scannedCode }));
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsed = articleSchema.safeParse(formData);
      if (!parsed.success) {
        const msg = parsed.error.issues?.[0]?.message ?? "Veuillez vérifier le formulaire";
        toast({
          title: "Champs manquants",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const data = parsed.data;
      
      // Uniformiser les formats (trim, minuscules pour comparaison)
      const normalizedRef = data.reference.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedDesignation = data.designation.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedMarque = data.marque.trim().toLowerCase().replace(/\s+/g, ' ');
      
      // Vérifier les doublons par référence (normalisée)
      const { data: existingByRef } = await supabase
        .from('articles')
        .select('id, reference, designation, marque')
        .maybeSingle();

      if (existingByRef) {
        const allArticles = await supabase
          .from('articles')
          .select('id, reference, designation, marque');
        
        const duplicate = allArticles.data?.find(article => {
          const articleRef = article.reference.toLowerCase().replace(/\s+/g, '');
          return articleRef === normalizedRef;
        });

        if (duplicate) {
          toast({
            title: "Doublon détecté",
            description: `Un article avec la référence "${duplicate.reference}" existe déjà`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Vérifier les doublons par désignation + marque similaire
      const { data: allArticles } = await supabase
        .from('articles')
        .select('id, reference, designation, marque');

      const similarArticle = allArticles?.find(article => {
        const artDesignation = article.designation.trim().toLowerCase().replace(/\s+/g, ' ');
        const artMarque = article.marque.trim().toLowerCase().replace(/\s+/g, ' ');
        return artDesignation === normalizedDesignation && artMarque === normalizedMarque;
      });

      if (similarArticle) {
        toast({
          title: "Doublon détecté",
          description: `Un article similaire existe déjà (Réf: ${similarArticle.reference})`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data: newArticle, error } = await supabase
        .from('articles')
        .insert([{
          reference: data.reference.trim(),
          designation: data.designation.trim(),
          marque: data.marque.trim(),
          categorie: data.categorie.trim(),
          stock: data.stock,
          stock_min: data.stockMin,
          stock_max: data.stockMax,
          prix_achat: data.prixAchat,
          emplacement_id: data.emplacementId ? data.emplacementId : null,
          fournisseur_id: data.fournisseurId ? data.fournisseurId : null,
          user_id: userData?.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Ajouter les compatibilités véhicules si sélectionnées
      if (selectedVehicules.length > 0 && newArticle) {
        const vehicleCompatibilities = selectedVehicules.map(vehiculeId => ({
          article_id: newArticle.id,
          vehicule_id: vehiculeId,
          user_id: userData?.user?.id
        }));

        const { error: vehicleError } = await supabase
          .from('article_vehicules')
          .insert(vehicleCompatibilities);

        if (vehicleError) {
          console.error('Erreur lors de l\'ajout des compatibilités véhicules:', vehicleError);
        }
      }

      toast({
        title: "Succès",
        description: "L'article a été créé avec succès",
      });

      setFormData({
        reference: "",
        designation: "",
        marque: "",
        categorie: "",
        stock: 0,
        stockMin: 0,
        stockMax: 100,
        prixAchat: 0,
        emplacementId: "",
        fournisseurId: "",
      });
      setSelectedVehicules([]);

      setOpen(false);
      onArticleCreated();
    } catch (error: any) {
      const message = error?.message || "Impossible de créer l'article";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton ? (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      ) : typeof controlledOpen === 'undefined' ? (
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Article
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background border border-border shadow-large z-50 w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Créer un nouvel article</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Référence *</Label>
              <div className="flex gap-2">
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    reference: e.target.value.trim().toUpperCase() 
                  }))}
                  placeholder="HM-530"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScanner(true)}
                  className="flex-shrink-0"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marque">Marque *</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s+/g, ' ');
                  setFormData(prev => ({ 
                    ...prev, 
                    marque: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                  }));
                }}
                placeholder="Castrol"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Désignation *</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => {
                const value = e.target.value.replace(/\s+/g, ' ');
                setFormData(prev => ({ 
                  ...prev, 
                  designation: value.charAt(0).toUpperCase() + value.slice(1)
                }));
              }}
              placeholder="Huile moteur 5W30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie *</Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) => {
                  if (value === "__create_new__") {
                    setShowCategorieDialog(true);
                  } else {
                    setFormData(prev => ({ ...prev, categorie: value }));
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px] overflow-y-auto">
                  <div className="p-2 border-b border-border mb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowCategorieDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle catégorie
                    </Button>
                  </div>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Select
                value={formData.fournisseurId}
                onValueChange={(value) => {
                  if (value === "__create_new__") {
                    setShowFournisseurDialog(true);
                  } else {
                    setFormData((prev) => ({ ...prev, fournisseurId: value === "none" ? "" : value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px] overflow-y-auto">
                  <div className="p-2 border-b border-border mb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowFournisseurDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau fournisseur
                    </Button>
                  </div>
                  <SelectItem value="none">Aucun fournisseur</SelectItem>
                  {fournisseurs.map((fournisseur) => (
                    <SelectItem key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Select
                value={formData.emplacementId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, emplacementId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px] overflow-y-auto">
                  <SelectItem value="none">Aucun emplacement</SelectItem>
                  {emplacements.map((emplacement) => (
                    <SelectItem key={emplacement.id} value={emplacement.id}>
                      {emplacement.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vehicules">Véhicules compatibles</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowVehiculeDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Nouveau véhicule
                </Button>
              </div>
              <Select
                value="_multiple"
                onValueChange={(value) => {
                  if (value !== "_multiple" && !selectedVehicules.includes(value)) {
                    setSelectedVehicules([...selectedVehicules, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedVehicules.length === 0 
                      ? "Sélectionner des véhicules" 
                      : `${selectedVehicules.length} véhicule(s) sélectionné(s)`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-medium z-[60] max-h-[200px] overflow-y-auto">
                  {vehicules.filter(v => !selectedVehicules.includes(v.id)).map((vehicule) => (
                    <SelectItem key={vehicule.id} value={vehicule.id}>
                      {vehicule.marque} {vehicule.modele} - {vehicule.immatriculation}
                    </SelectItem>
                  ))}
                  {vehicules.filter(v => !selectedVehicules.includes(v.id)).length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {vehicules.length === 0 ? "Aucun véhicule disponible" : "Tous les véhicules sélectionnés"}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedVehicules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedVehicules.map((vehiculeId) => {
                    const vehicule = vehicules.find(v => v.id === vehiculeId);
                    return vehicule ? (
                      <div key={vehiculeId} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                        <span>{vehicule.marque} {vehicule.modele}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedVehicules(selectedVehicules.filter(id => id !== vehiculeId))}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock initial</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMin">Stock minimum</Label>
              <Input
                id="stockMin"
                type="number"
                min="0"
                value={formData.stockMin}
                onChange={(e) => setFormData(prev => ({ ...prev, stockMin: parseInt(e.target.value) || 0 }))}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMax">Stock maximum</Label>
              <Input
                id="stockMax"
                type="number"
                min="1"
                value={formData.stockMax}
                onChange={(e) => setFormData(prev => ({ ...prev, stockMax: parseInt(e.target.value) || 100 }))}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de prix</Label>
              <RadioGroup value={priceType} onValueChange={(val: "HT" | "TTC") => setPriceType(val)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HT" id="ht" />
                  <Label htmlFor="ht" className="font-normal cursor-pointer">Hors taxes (HT)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TTC" id="ttc" />
                  <Label htmlFor="ttc" className="font-normal cursor-pointer">Toutes taxes comprises (TTC)</Label>
                </div>
              </RadioGroup>
            </div>

            {priceType === "TTC" && (
              <div className="space-y-2">
                <Label htmlFor="tva">Taux de TVA (%)</Label>
                <Select value={tvaTaux.toString()} onValueChange={(val) => setTvaTaux(parseFloat(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-medium z-[60]">
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="8.5">8,5%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prixAchat">Prix d'achat {priceType} (€)</Label>
              <Input
                id="prixAchat"
                type="number"
                step="0.01"
                min="0"
                value={formData.prixAchat}
                onChange={(e) => {
                  const inputPrice = parseFloat(e.target.value) || 0;
                  let prixHT = inputPrice;
                  
                  if (priceType === "TTC" && tvaTaux > 0) {
                    prixHT = inputPrice / (1 + tvaTaux / 100);
                  }
                  
                  setFormData(prev => ({ ...prev, prixAchat: prixHT }));
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
              />
              {priceType === "TTC" && tvaTaux > 0 && formData.prixAchat > 0 && (
                <p className="text-sm text-muted-foreground">
                  Prix HT : {formData.prixAchat.toFixed(2)} €
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Création..." : "Créer l'article"}
            </Button>
          </div>
        </form>

        {/* Scanner de code-barres */}
        <BarcodeScanner
          isOpen={showScanner}
          onScanResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      </DialogContent>

      {/* Dialogues de création en dehors du dropdown */}
      <CreateFournisseurDialog
        open={showFournisseurDialog}
        onOpenChange={setShowFournisseurDialog}
        onFournisseurCreated={(id) => {
          fetchFournisseurs();
          setFormData(prev => ({ ...prev, fournisseurId: id }));
        }}
      />

      <CreateCategorieDialog
        open={showCategorieDialog}
        onOpenChange={setShowCategorieDialog}
        onCategorieCreated={(nom) => {
          fetchCategories();
          setFormData(prev => ({ ...prev, categorie: nom }));
        }}
      />

      <CreateVehiculeDialog
        open={showVehiculeDialog}
        onOpenChange={setShowVehiculeDialog}
        onVehiculeCreated={fetchVehicules}
      />
    </Dialog>
  );
}