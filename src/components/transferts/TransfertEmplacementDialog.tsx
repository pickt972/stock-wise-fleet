import { useState, useEffect } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  stock: number;
  emplacement_id?: string;
  categorie?: string;
}

interface Emplacement {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
}

interface TransfertEmplacementDialogProps {
  onTransfertCompleted?: () => void;
}

export function TransfertEmplacementDialog({ onTransfertCompleted }: TransfertEmplacementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [formData, setFormData] = useState({
    articleId: "",
    quantity: 1,
    emplacementDestinationId: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchArticles();
      fetchEmplacements();
    }
  }, [isOpen]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque, stock, emplacement_id, categorie')
        .gt('stock', 0)
        .order('designation');

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des articles:', error);
    }
  };

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('emplacements')
        .select('id, nom, description, actif')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setEmplacements(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des emplacements:', error);
    }
  };

  const getEmplacementNom = (emplacementId: string | null | undefined) => {
    if (!emplacementId) return "Aucun emplacement";
    const emplacement = emplacements.find(e => e.id === emplacementId);
    return emplacement?.nom || "Emplacement inconnu";
  };

  const createTransfert = async () => {
    if (!formData.articleId || !formData.quantity || !formData.emplacementDestinationId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const selectedArticle = articles.find(a => a.id === formData.articleId);
    if (!selectedArticle) {
      toast({
        title: "Erreur",
        description: "Article non trouvé",
        variant: "destructive",
      });
      return;
    }

    if (selectedArticle.stock < formData.quantity) {
      toast({
        title: "Erreur",
        description: `Stock insuffisant. Stock disponible: ${selectedArticle.stock}`,
        variant: "destructive",
      });
      return;
    }

    if (selectedArticle.emplacement_id === formData.emplacementDestinationId) {
      toast({
        title: "Erreur",
        description: "L'article est déjà dans cet emplacement",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const emplacementSource = getEmplacementNom(selectedArticle.emplacement_id);
      const emplacementDestination = getEmplacementNom(formData.emplacementDestinationId);

      // Créer un mouvement de sortie de l'emplacement source
      const { error: sortieError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'sortie',
          quantity: formData.quantity,
          motif: `Transfert vers ${emplacementDestination}`,
          user_id: user?.id,
        }]);

      if (sortieError) throw sortieError;

      // Créer un mouvement d'entrée vers l'emplacement de destination
      const { error: entreeError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'entree',
          quantity: formData.quantity,
          motif: `Transfert depuis ${emplacementSource}`,
          user_id: user?.id,
        }]);

      if (entreeError) throw entreeError;

      // Diminuer le stock de l'article source
      const { error: updateSourceError } = await supabase
        .from('articles')
        .update({ 
          stock: selectedArticle.stock - formData.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.articleId);

      if (updateSourceError) throw updateSourceError;

      // Vérifier s'il existe déjà un article avec la même référence dans l'emplacement de destination
      const emplacementDestinationData = emplacements.find(e => e.id === formData.emplacementDestinationId);
      const { data: existingArticle, error: searchError } = await supabase
        .from('articles')
        .select('id, stock')
        .eq('reference', selectedArticle.reference)
        .eq('emplacement_id', formData.emplacementDestinationId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (existingArticle) {
        // Mettre à jour l'article existant dans l'emplacement de destination
        const { error: updateDestError } = await supabase
          .from('articles')
          .update({ 
            stock: existingArticle.stock + formData.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingArticle.id);

        if (updateDestError) throw updateDestError;
      } else {
        // Créer un nouvel article dans l'emplacement de destination
        const { error: createError } = await supabase
          .from('articles')
          .insert([{
            reference: selectedArticle.reference,
            designation: selectedArticle.designation,
            marque: selectedArticle.marque,
            categorie: selectedArticle.categorie || '',
            stock: formData.quantity,
            stock_min: 0,
            stock_max: 100,
            prix_achat: 0,
            emplacement_id: formData.emplacementDestinationId,
            emplacement: emplacementDestinationData?.nom || '',
            user_id: user?.id
          }]);

        if (createError) throw createError;
      }

      toast({
        title: "Succès",
        description: `Transfert effectué: ${formData.quantity} ${selectedArticle.designation} vers ${emplacementDestination}`,
      });

      setFormData({
        articleId: "",
        quantity: 1,
        emplacementDestinationId: "",
      });

      setIsOpen(false);
      onTransfertCompleted?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'effectuer le transfert",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const selectedArticle = articles.find(a => a.id === formData.articleId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-background hover:bg-accent w-full lg:w-auto flex-shrink-0">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Transfert Emplacement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transfert entre emplacements
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="article">Article à transférer *</Label>
            <Select
              value={formData.articleId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, articleId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un article" />
              </SelectTrigger>
              <SelectContent>
                {articles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    {article.reference} - {article.designation} (Stock: {article.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedArticle && (
              <div className="text-sm text-muted-foreground">
                <p>Emplacement actuel: {getEmplacementNom(selectedArticle.emplacement_id)}</p>
                <p>Stock disponible: {selectedArticle.stock}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité à transférer *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedArticle?.stock || 1}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emplacementDestination">Emplacement de destination *</Label>
            <Select
              value={formData.emplacementDestinationId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, emplacementDestinationId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'emplacement de destination" />
              </SelectTrigger>
              <SelectContent>
                {emplacements
                  .filter(emplacement => selectedArticle?.emplacement_id !== emplacement.id)
                  .map((emplacement) => (
                  <SelectItem key={emplacement.id} value={emplacement.id}>
                    {emplacement.nom}
                    {emplacement.description && ` - ${emplacement.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              onClick={createTransfert}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              {isCreating ? "Transfert en cours..." : "Effectuer le transfert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}