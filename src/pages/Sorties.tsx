import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";

interface Article {
  id: string;
  reference: string;
  designation: string;
  stock: number;
}

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export default function Sorties() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    articleId: "",
    quantity: "",
    motif: "",
    vehiculeId: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const motifs = [
    "Installation",
    "Réparation",
    "Maintenance",
    "Transfert sortant",
    "Autre"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, vehiculesRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id, reference, designation, stock')
          .order('designation'),
        supabase
          .from('vehicules')
          .select('id, marque, modele, immatriculation')
          .eq('actif', true)
          .order('immatriculation')
      ]);

      if (articlesRes.error) throw articlesRes.error;
      if (vehiculesRes.error) throw vehiculesRes.error;

      setArticles(articlesRes.data || []);
      setVehicules(vehiculesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.articleId) {
      newErrors.articleId = "Veuillez sélectionner un article";
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = "La quantité doit être supérieure à 0";
    }
    if (!formData.motif) {
      newErrors.motif = "Veuillez sélectionner un motif";
    }

    // Vérifier le stock disponible
    const selectedArticle = articles.find(a => a.id === formData.articleId);
    if (selectedArticle && parseInt(formData.quantity) > selectedArticle.stock) {
      newErrors.quantity = `Stock insuffisant. Disponible: ${selectedArticle.stock}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const quantity = parseInt(formData.quantity);
    const selectedArticle = articles.find(a => a.id === formData.articleId);
    
    // Vérifier si la sortie représente plus de 30% du stock
    if (selectedArticle && quantity > selectedArticle.stock * 0.3) {
      setShowConfirmDialog(true);
      return;
    }

    executeSubmit();
  };

  const executeSubmit = async () => {
    setShowConfirmDialog(false);
    setIsCreating(true);
    try {
      const quantity = parseInt(formData.quantity);

      // Mettre à jour le stock via la fonction sécurisée AVANT de créer le mouvement
      const { data: rpcData, error: updateError } = await supabase.rpc('update_article_stock', {
        article_id: formData.articleId,
        quantity_change: -quantity, // Négatif pour une sortie
      });

      if (updateError) {
        console.error('Erreur RPC update_article_stock:', updateError);
        throw new Error(updateError.message || "Erreur lors de la mise à jour du stock");
      }

      // Créer la sortie de stock APRÈS la mise à jour du stock
      const { error: exitError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'sortie',
          quantity: quantity,
          motif: formData.motif,
          user_id: user?.id,
          vehicule_id: formData.vehiculeId || null,
        }]);

      if (exitError) {
        console.error('Erreur insertion stock_movements:', exitError);
        throw new Error(exitError.message || "Erreur lors de l'enregistrement du mouvement");
      }

      // Récupérer les détails de l'article pour le toast
      const selectedArticle = articles.find(a => a.id === formData.articleId);
      
      toast({
        title: "✅ Retrait effectué",
        description: selectedArticle 
          ? `${quantity}x ${selectedArticle.designation}`
          : "Sortie de stock enregistrée avec succès",
      });

      // Retour au dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erreur lors de la création de la sortie:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title="Sortie de stock" showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Formulaire */}
          <div className="space-y-4">
            {/* Scanner ou recherche rapide */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Scanner ou rechercher
              </Label>
              <SearchWithScanner
                placeholder="Scanner ou chercher un article..."
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  // Rechercher l'article par code-barre ou référence
                  const foundArticle = articles.find(
                    a => a.reference?.toLowerCase().includes(value.toLowerCase()) ||
                         a.designation?.toLowerCase().includes(value.toLowerCase())
                  );
                  if (foundArticle) {
                    setFormData({ ...formData, articleId: foundArticle.id });
                    setErrors({ ...errors, articleId: "" });
                  }
                }}
              />
            </div>

            {/* Article */}
            <div className="space-y-2">
              <Label htmlFor="article" className="text-sm font-semibold">
                Article *
              </Label>
              <Select
                value={formData.articleId}
                onValueChange={(value) => {
                  setFormData({ ...formData, articleId: value });
                  setErrors({ ...errors, articleId: "" });
                }}
              >
                <SelectTrigger 
                  id="article"
                  className={`h-11 border-2 ${errors.articleId ? 'border-destructive' : ''}`}
                >
                  <SelectValue placeholder="Sélectionner un article" />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.designation} - Stock: {article.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.articleId && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠️</span> {errors.articleId}
                </p>
              )}
            </div>

            {/* Quantité */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-semibold">
                Quantité *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  setErrors({ ...errors, quantity: "" });
                }}
                className={`h-11 border-2 text-base ${errors.quantity ? 'border-destructive' : ''}`}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠️</span> {errors.quantity}
                </p>
              )}
            </div>

            {/* Motif */}
            <div className="space-y-2">
              <Label htmlFor="motif" className="text-sm font-semibold">
                Motif *
              </Label>
              <Select
                value={formData.motif}
                onValueChange={(value) => {
                  setFormData({ ...formData, motif: value });
                  setErrors({ ...errors, motif: "" });
                }}
              >
                <SelectTrigger 
                  id="motif"
                  className={`h-11 border-2 ${errors.motif ? 'border-destructive' : ''}`}
                >
                  <SelectValue placeholder="Sélectionner un motif" />
                </SelectTrigger>
                <SelectContent>
                  {motifs.map((motif) => (
                    <SelectItem key={motif} value={motif}>
                      {motif}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.motif && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠️</span> {errors.motif}
                </p>
              )}
            </div>

            {/* Véhicule (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="vehicule" className="text-sm font-semibold">
                Véhicule (optionnel)
              </Label>
              <Select
                value={formData.vehiculeId}
                onValueChange={(value) => setFormData({ ...formData, vehiculeId: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="vehicule" className="h-11 border-2">
                  <SelectValue placeholder="Aucun véhicule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {vehicules.map((vehicule) => (
                    <SelectItem key={vehicule.id} value={vehicule.id}>
                      {vehicule.immatriculation} - {vehicule.marque} {vehicule.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Notes (optionnel)
              </Label>
              <Textarea
                id="notes"
                placeholder="Informations complémentaires..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[80px] border-2 resize-none"
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3 pt-8">
            <ActionButton
              variant="warning"
              size="xxl"
              className="w-full"
              onClick={handleSubmit}
              disabled={isCreating}
            >
              {isCreating ? "Enregistrement..." : "💾 Enregistrer"}
            </ActionButton>

            <ActionButton
              variant="secondary"
              size="xxl"
              className="w-full"
              onClick={handleCancel}
              disabled={isCreating}
            >
              ❌ Annuler
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmer sortie importante</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez retirer {formData.quantity} unités{' '}
              {(() => {
                const selectedArticle = articles.find(a => a.id === formData.articleId);
                if (selectedArticle) {
                  const percentage = ((parseInt(formData.quantity) / selectedArticle.stock) * 100).toFixed(1);
                  return `(${percentage}% du stock actuel de ${selectedArticle.stock} unités)`;
                }
                return '';
              })()}.
              <br /><br />
              Êtes-vous sûr de vouloir continuer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit}>
              Confirmer la sortie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
