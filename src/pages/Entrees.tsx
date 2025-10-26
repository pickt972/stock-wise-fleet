import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Fournisseur {
  id: string;
  nom: string;
}

export default function Entrees() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [sku, setSku] = useState(searchParams.get('sku') || "");
  const returnTo = searchParams.get('returnTo');
  const [formData, setFormData] = useState({
    articleId: "",
    quantity: "",
    motif: "",
    fournisseurId: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const motifs = [
    "Achat",
    "Retour client",
    "Correction inventaire",
    "Transfert entrant",
    "Autre"
  ];

  useEffect(() => {
    fetchData();
    
    // Pré-remplir l'article si passé depuis ArticleDetail
    if (location.state?.prefilledArticleId) {
      setFormData(prev => ({
        ...prev,
        articleId: location.state.prefilledArticleId
      }));
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      const [articlesRes, fournisseursRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id, reference, designation, stock')
          .order('designation'),
        supabase
          .from('fournisseurs')
          .select('id, nom')
          .eq('actif', true)
          .order('nom')
      ]);

      if (articlesRes.error) throw articlesRes.error;
      if (fournisseursRes.error) throw fournisseursRes.error;

      setArticles(articlesRes.data || []);
      setFournisseurs(fournisseursRes.data || []);
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const quantity = parseInt(formData.quantity);

      // Mettre à jour le stock via la fonction sécurisée AVANT de créer le mouvement
      const { data: rpcData, error: updateError } = await supabase.rpc('update_article_stock', {
        article_id: formData.articleId,
        quantity_change: quantity, // Positif pour une entrée
      });

      if (updateError) {
        console.error('Erreur RPC update_article_stock:', updateError);
        throw new Error(updateError.message || "Erreur lors de la mise à jour du stock");
      }

      // Créer l'entrée de stock APRÈS la mise à jour du stock
      const { error: entryError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'entree',
          quantity: quantity,
          motif: formData.motif,
          user_id: user?.id,
          fournisseur_id: formData.fournisseurId || null,
        }]);

      if (entryError) {
        console.error('Erreur insertion stock_movements:', entryError);
        throw new Error(entryError.message || "Erreur lors de l'enregistrement du mouvement");
      }

      // Récupérer les détails de l'article pour le toast
      const selectedArticle = articles.find(a => a.id === formData.articleId);
      
      toast({
        title: "✅ Stock ajouté avec succès",
        description: selectedArticle 
          ? `${quantity}x ${selectedArticle.designation}`
          : "Entrée de stock enregistrée avec succès",
      });

      // Rediriger vers la page d'origine ou dashboard
      setTimeout(() => {
        if (returnTo) {
          navigate(returnTo);
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'entrée:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer l'entrée",
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
        <PageHeader title="Ajouter un article" showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Formulaire - un champ par ligne */}
          <div className="space-y-4">
            {/* Code-barres/SKU (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-sm font-semibold">
                Code-barres/SKU (optionnel)
              </Label>
              <Input
                id="sku"
                placeholder="Ex: ABC123456789"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="h-11 border-2"
              />
              <p className="text-xs text-muted-foreground">
                Ce code sera enregistré avec l'article
              </p>
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

            {/* Fournisseur (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="fournisseur" className="text-sm font-semibold">
                Fournisseur (optionnel)
              </Label>
              <Select
                value={formData.fournisseurId}
                onValueChange={(value) => setFormData({ ...formData, fournisseurId: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="fournisseur" className="h-11 border-2">
                  <SelectValue placeholder="Aucun fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {fournisseurs.map((fournisseur) => (
                    <SelectItem key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
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
              variant="success"
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
    </DashboardLayout>
  );
}
