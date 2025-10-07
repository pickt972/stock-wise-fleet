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
import { CreateFournisseurDialog } from "@/components/fournisseurs/CreateFournisseurDialog";
import { CreateCategorieDialog } from "@/components/categories/CreateCategorieDialog";
import { z } from "zod";
interface CreateArticleDialogProps {
  onArticleCreated: () => void;
  triggerButton?: React.ReactNode;
}

export function CreateArticleDialog({ onArticleCreated, triggerButton }: CreateArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [showFournisseurDialog, setShowFournisseurDialog] = useState(false);
  const [showCategorieDialog, setShowCategorieDialog] = useState(false);
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
    if (open) {
      fetchFournisseurs();
      fetchCategories();
      fetchEmplacements();
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
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
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
        emplacementId: "",
        fournisseurId: "",
      });

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
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Article
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background border border-border shadow-large z-50">
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

          <div className="space-y-2">
            <Label htmlFor="prixAchat">Prix d'achat (€)</Label>
            <Input
              id="prixAchat"
              type="number"
              step="0.01"
              min="0"
              value={formData.prixAchat}
              onChange={(e) => setFormData(prev => ({ ...prev, prixAchat: parseFloat(e.target.value) || 0 }))}
              onFocus={(e) => e.target.select()}
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
    </Dialog>
  );
}