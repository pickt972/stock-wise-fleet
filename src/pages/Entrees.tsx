import { useState, useEffect } from "react";
import { ArrowDownToLine, Plus, Package, Calendar, User } from "lucide-react";
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

interface StockEntry {
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
}

export default function Entrees() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    articleId: "",
    quantity: 1,
    motif: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const motifs = [
    "Achat",
    "Retour client",
    "Correction inventaire",
    "Transfert entrant",
    "Autre"
  ];

  useEffect(() => {
    fetchEntries();
    fetchArticles();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          article_id,
          quantity,
          motif,
          created_at,
          articles!inner(id, reference, designation, marque, stock),
          profiles!inner(first_name, last_name)
        `)
        .eq('type', 'entree')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des entrées:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entrées",
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

  const createEntry = async () => {
    if (!formData.articleId || !formData.quantity || !formData.motif) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Créer l'entrée de stock
      const { error: entryError } = await supabase
        .from('stock_movements')
        .insert([{
          article_id: formData.articleId,
          type: 'entree',
          quantity: formData.quantity,
          motif: formData.motif,
          user_id: user?.id,
        }]);

      if (entryError) throw entryError;

      // Mettre à jour le stock de l'article
      const { error: updateError } = await supabase
        .rpc('update_article_stock', {
          article_id: formData.articleId,
          quantity_change: formData.quantity
        });

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "L'entrée de stock a été enregistrée",
      });

      setFormData({
        articleId: "",
        quantity: 1,
        motif: "",
      });

      setIsDialogOpen(false);
      fetchEntries();
      fetchArticles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer l'entrée",
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
          <div className="text-lg text-muted-foreground">Chargement des entrées...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Entrées de stock</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Gérez les entrées de marchandises</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Entrée
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle entrée de stock</DialogTitle>
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
                          {article.reference} - {article.designation}
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
                    onClick={createEntry}
                    disabled={isCreating}
                    className="w-full sm:w-auto"
                  >
                    {isCreating ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scanner d'articles */}
        <ArticleScanner onArticleFound={handleArticleFound} />

        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Historique des entrées
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
                    <TableHead className="w-32">Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune entrée enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {entry.articles.reference}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{entry.articles.designation}</div>
                            <div className="text-xs text-muted-foreground">{entry.articles.marque}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            +{entry.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.motif}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {entry.profiles.first_name} {entry.profiles.last_name}
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