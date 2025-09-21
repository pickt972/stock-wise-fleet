import { useState, useEffect } from "react";
import { ArrowUpFromLine, Plus, Package, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "./DashboardLayout";
import { ArticleScanner } from "@/components/scanner/ArticleScanner";
import { CreateVehiculeDialog } from "@/components/vehicules/CreateVehiculeDialog";
import { TransfertEmplacementDialog } from "@/components/transferts/TransfertEmplacementDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  stock: number;
}

interface StockExit {
  id: string;
  article_id: string;
  quantity: number;
  motif: string;
  created_at: string;
  articles: Article;
  profiles: {
    first_name: string;
    last_name: string;
  };
  vehicules?: {
    immatriculation: string;
  };
}

export default function Sorties() {
  const [exits, setExits] = useState<StockExit[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    articleId: "",
    quantity: 1,
    motif: "",
    vehiculeId: "",
  });
  const [vehicules, setVehicules] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const motifs = [
    "Vente",
    "Consommation interne",
    "Casse/Perte",
    "Transfert sortant",
    "Retour fournisseur",
    "Autre"
  ];

  useEffect(() => {
    fetchExits();
    fetchArticles();
    fetchVehicules();
  }, []);

  const fetchExits = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          article_id,
          quantity,
          motif,
          created_at,
          user_id,
          vehicule_id
        `)
        .eq('type', 'sortie')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les informations des articles, utilisateurs et véhicules séparément
      if (data && data.length > 0) {
        const articleIds = [...new Set(data.map(exit => exit.article_id))];
        const userIds = [...new Set(data.map(exit => exit.user_id))];
        const vehiculeIds = [...new Set(data.map(exit => exit.vehicule_id).filter(Boolean))];

        const [articlesResponse, profilesResponse, vehiculesResponse] = await Promise.all([
          supabase.from('articles').select('id, reference, designation, marque, stock').in('id', articleIds),
          supabase.from('profiles').select('id, first_name, last_name').in('id', userIds),
          vehiculeIds.length > 0 
            ? supabase.from('vehicules').select('id, immatriculation').in('id', vehiculeIds)
            : Promise.resolve({ data: [] })
        ]);

        const articlesMap = new Map(articlesResponse.data?.map(a => [a.id, a]) || []);
        const profilesMap = new Map(profilesResponse.data?.map(p => [p.id, p]) || []);
        const vehiculesMap = new Map((vehiculesResponse.data || []).map(v => [v.id, v]));

        const enrichedExits = data.map(exit => ({
          ...exit,
          articles: articlesMap.get(exit.article_id) || { reference: '', designation: '', marque: '', stock: 0 },
          profiles: profilesMap.get(exit.user_id) || { first_name: '', last_name: '' },
          vehicules: exit.vehicule_id ? vehiculesMap.get(exit.vehicule_id) : null
        }));

        setExits(enrichedExits as any);
      } else {
        setExits([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des sorties:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sorties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque, stock')
        .order('designation');

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des articles:', error);
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
    } catch (error: any) {
      console.error('Erreur lors du chargement des véhicules:', error);
    }
  };

  const createExit = async () => {
    if (!formData.articleId || !formData.quantity || !formData.motif) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    // Vérifier le stock disponible
    const selectedArticle = articles.find(a => a.id === formData.articleId);
    if (selectedArticle && selectedArticle.stock < formData.quantity) {
      toast({
        title: "Erreur",
        description: `Stock insuffisant. Stock disponible: ${selectedArticle.stock}`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Créer la sortie de stock
      const { error: exitError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'sortie',
          quantity: formData.quantity,
          motif: formData.motif,
          user_id: user?.id,
          vehicule_id: formData.vehiculeId || null,
        }]);

      if (exitError) throw exitError;

      // Récupérer le stock actuel et le mettre à jour
      const { data: currentArticle, error: fetchError } = await supabase
        .from('articles')
        .select('stock')
        .eq('id', formData.articleId)
        .single();

      if (fetchError) throw fetchError;

      const newStock = currentArticle.stock - formData.quantity;
      if (newStock < 0) {
        throw new Error(`Stock insuffisant. Stock disponible: ${currentArticle.stock}`);
      }

      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.articleId);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "La sortie de stock a été enregistrée",
      });

      setFormData({
        articleId: "",
        quantity: 1,
        motif: "",
        vehiculeId: "",
      });

      setIsDialogOpen(false);
      fetchExits();
      fetchArticles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleArticleFound = (article: Article) => {
    setFormData(prev => ({ ...prev, articleId: article.id }));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Chargement des sorties...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Sorties de stock</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Gérez les sorties de marchandises</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Sortie
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle sortie de stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="article">Article *</Label>
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      required
                    />
                    {formData.articleId && (
                      <p className="text-xs text-muted-foreground">
                        Stock disponible: {articles.find(a => a.id === formData.articleId)?.stock || 0}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motif">Motif *</Label>
                    <Select
                      value={formData.motif}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, motif: value }))}
                    >
                      <SelectTrigger>
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
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vehicule">Véhicule (optionnel)</Label>
                    <CreateVehiculeDialog 
                      onVehiculeCreated={fetchVehicules}
                      onVehiculeSelected={(vehiculeId) => setFormData(prev => ({ ...prev, vehiculeId }))}
                    />
                  </div>
                  <Select
                    value={formData.vehiculeId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, vehiculeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicules.map((vehicule) => (
                        <SelectItem key={vehicule.id} value={vehicule.id}>
                          {vehicule.immatriculation} - {vehicule.marque} {vehicule.modele}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={createExit}
                    disabled={isCreating}
                    className="w-full sm:w-auto"
                  >
                    {isCreating ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
            
            <TransfertEmplacementDialog 
              onTransfertCompleted={() => {
                fetchExits();
                fetchArticles();
              }}
            />
          </div>
        </div>

        {/* Scanner d'articles */}
        <ArticleScanner onArticleFound={handleArticleFound} />

        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Historique des sorties
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-28">Référence</TableHead>
                    <TableHead className="w-48">Article</TableHead>
                    <TableHead className="w-20">Quantité</TableHead>
                    <TableHead className="w-32">Motif</TableHead>
                    <TableHead className="w-32">Véhicule</TableHead>
                    <TableHead className="w-32">Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune sortie enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    exits.map((exit) => (
                      <TableRow key={exit.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(exit.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {exit.articles.reference}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{exit.articles.designation}</div>
                            <div className="text-xs text-muted-foreground">{exit.articles.marque}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            -{exit.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {exit.motif}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {exit.vehicules?.immatriculation || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {exit.profiles.first_name} {exit.profiles.last_name}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}