import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const fetchCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('nom')
      .eq('actif', true)
      .order('nom');

    if (error) throw error;
    return data?.map(cat => cat.nom) || [];
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
    // Fallback vers les catégories par défaut
    return [
      "Électronique",
      "Informatique", 
      "Mobilier",
      "Fournitures",
      "Équipement",
      "Consommables"
    ];
  }
};

export function EditArticleDialog({ article, onArticleUpdated }: EditArticleDialogProps) {
  console.count("[EditArticleDialog] render");
  const [open, setOpen] = useState(true); // Start open since it's rendered conditionally
  const [isLoading, setIsLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [priceType, setPriceType] = useState<"HT" | "TTC">("HT");
  const [tvaTaux, setTvaTaux] = useState(0);
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

  // Mettre à jour le formData quand l'article change
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
  
  const { toast } = useToast();

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('id, nom')
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
        .select('id, nom')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setEmplacements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emplacements:', error);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
    fetchEmplacements();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await fetchCategories();
    setCategories(cats);
  };

  const handleClose = () => {
    setOpen(false);
    // Call onArticleUpdated to notify parent to remove this dialog
    onArticleUpdated();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          reference: formData.reference,
          designation: formData.designation,
          marque: formData.marque,
          categorie: formData.categorie,
          // Ne pas mettre à jour le stock ici: il est géré par les mouvements/entrées/sorties et transferts
          stock_min: formData.stock_min,
          stock_max: formData.stock_max,
          prix_achat: formData.prix_achat,
          emplacement: formData.emplacement,
          fournisseur_id: formData.fournisseur_id === "none" ? null : formData.fournisseur_id,
        })
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: "Article modifié",
        description: "L'article a été modifié avec succès",
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'article",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[640px] sm:w-full rounded-lg max-h-[95dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base sm:text-xl">Modifier l'article</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Modifiez les informations de l'article.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-xs sm:text-sm">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marque" className="text-xs sm:text-sm">Marque</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                required
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="designation" className="text-xs sm:text-sm">Désignation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              required
              className="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="categorie" className="text-xs sm:text-sm">Catégorie</Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) => setFormData({ ...formData, categorie: value })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fournisseur" className="text-xs sm:text-sm">Fournisseur</Label>
              <Select
                value={formData.fournisseur_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, fournisseur_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-[60]">
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

          <div className="space-y-1.5">
            <Label htmlFor="emplacement" className="text-xs sm:text-sm">Emplacement</Label>
            <Select
              value={formData.emplacement}
              onValueChange={(value) => setFormData({ ...formData, emplacement: value })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Sélectionner un emplacement" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-[60]">
                <SelectItem value="none">Aucun emplacement</SelectItem>
                {emplacements.map((emplacement) => (
                  <SelectItem key={emplacement.id} value={emplacement.nom}>
                    {emplacement.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock" className="text-xs sm:text-sm">Stock actuel (information)</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              disabled
              className="bg-muted h-11 text-base"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Le stock ne peut être modifié que par les entrées, sorties et transferts
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stock_min" className="text-xs sm:text-sm">Stock minimum</Label>
              <Input
                id="stock_min"
                type="number"
                min="0"
                value={formData.stock_min}
                onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock_max" className="text-xs sm:text-sm">Stock maximum</Label>
              <Input
                id="stock_max"
                type="number"
                min="0"
                value={formData.stock_max}
                onChange={(e) => setFormData({ ...formData, stock_max: parseInt(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                required
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de prix</Label>
              <RadioGroup value={priceType} onValueChange={(val: "HT" | "TTC") => setPriceType(val)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="HT" id="edit-ht" />
                  <Label htmlFor="edit-ht" className="font-normal cursor-pointer">Hors taxes (HT)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TTC" id="edit-ttc" />
                  <Label htmlFor="edit-ttc" className="font-normal cursor-pointer">Toutes taxes comprises (TTC)</Label>
                </div>
              </RadioGroup>
            </div>

            {priceType === "TTC" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-tva" className="text-xs sm:text-sm">Taux de TVA (%)</Label>
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
              <Label htmlFor="prix_achat" className="text-xs sm:text-sm">Prix d'achat {priceType} (€)</Label>
              <Input
                id="prix_achat"
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
                required
                className="h-11 text-base"
              />
              {priceType === "TTC" && tvaTaux > 0 && formData.prix_achat > 0 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Prix HT : {formData.prix_achat.toFixed(2)} €
                </p>
              )}
            </div>
          </div>

          <ArticleVehicleCompatibility articleId={article.id} />

          <ArticleEmplacementsList 
            articleReference={article.reference}
            articleDesignation={article.designation}
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto h-11">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto h-11">
              {isLoading ? "Modification..." : "Modifier l'article"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}