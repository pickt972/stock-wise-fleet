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
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const categories = [
  "Électronique",
  "Informatique", 
  "Mobilier",
  "Fournitures",
  "Équipement",
  "Consommables"
];

export function EditArticleDialog({ article, onArticleUpdated }: EditArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
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
    fournisseur_id: article.fournisseur_id || "",
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
      fournisseur_id: article.fournisseur_id || "",
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

  useEffect(() => {
    if (open) {
      fetchFournisseurs();
    }
  }, [open]);

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
          stock: formData.stock,
          stock_min: formData.stock_min,
          stock_max: formData.stock_max,
          prix_achat: formData.prix_achat,
          emplacement: formData.emplacement,
          fournisseur_id: formData.fournisseur_id || null,
        })
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: "Article modifié",
        description: "L'article a été modifié avec succès",
      });

      setOpen(false);
      onArticleUpdated();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(true)} aria-label="Modifier l'article">
          <Edit className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier l'article</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'article.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Désignation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) => setFormData({ ...formData, categorie: value })}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Select
                value={formData.fournisseur_id}
                onValueChange={(value) => setFormData({ ...formData, fournisseur_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="">Aucun fournisseur</SelectItem>
                  {fournisseurs.map((fournisseur) => (
                    <SelectItem key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Input
                id="emplacement"
                value={formData.emplacement}
                onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock actuel</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_min">Stock minimum</Label>
              <Input
                id="stock_min"
                type="number"
                min="0"
                value={formData.stock_min}
                onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_max">Stock maximum</Label>
              <Input
                id="stock_max"
                type="number"
                min="0"
                value={formData.stock_max}
                onChange={(e) => setFormData({ ...formData, stock_max: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prix_achat">Prix d'achat (€)</Label>
            <Input
              id="prix_achat"
              type="number"
              step="0.01"
              min="0"
              value={formData.prix_achat}
              onChange={(e) => setFormData({ ...formData, prix_achat: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Modification..." : "Modifier l'article"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}