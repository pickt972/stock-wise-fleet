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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";

interface CreateArticleDialogProps {
  onArticleCreated: () => void;
}

export function CreateArticleDialog({ onArticleCreated }: CreateArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    reference: "",
    designation: "",
    marque: "",
    categorie: "",
    stock: 0,
    stockMin: 0,
    stockMax: 100,
    prixAchat: 0,
    emplacement: "",
    fournisseurId: "",
  });

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
      fetchCategories();
    }
  }, [open]);

  const [categories, setCategories] = useState<string[]>([]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('nom')
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
      const { error } = await supabase
        .from('articles')
        .insert([{
          reference: formData.reference,
          designation: formData.designation,
          marque: formData.marque,
          categorie: formData.categorie,
          stock: formData.stock,
          stock_min: formData.stockMin,
          stock_max: formData.stockMax,
          prix_achat: formData.prixAchat,
          emplacement: formData.emplacement,
          fournisseur_id: formData.fournisseurId || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

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
        emplacement: "",
        fournisseurId: "",
      });

      setOpen(false);
      onArticleCreated();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'article",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel Article
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
              placeholder="Huile moteur 5W30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie *</Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categorie: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, fournisseurId: value }))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Input
                id="emplacement"
                value={formData.emplacement}
                onChange={(e) => setFormData(prev => ({ ...prev, emplacement: e.target.value }))}
                placeholder="A1-B2"
              />
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prixAchat">Prix d'achat (€)</Label>
            <Input
              id="prixAchat"
              type="number"
              step="0.01"
              min="0"
              value={formData.prixAchat}
              onChange={(e) => setFormData(prev => ({ ...prev, prixAchat: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
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
    </Dialog>
  );
}