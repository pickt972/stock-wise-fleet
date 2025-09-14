import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ArticleFournisseur {
  id: string;
  article_id: string;
  fournisseur_id: string;
  prix_fournisseur?: number;
  reference_fournisseur?: string;
  delai_livraison?: number;
  quantite_minimum: number;
  est_principal: boolean;
  actif: boolean;
  notes?: string;
  fournisseurs?: {
    id: string;
    nom: string;
    email?: string;
    telephone?: string;
  };
}

interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
}

interface ArticleFournisseursManagementProps {
  articleId: string;
  articleNom: string;
}

export function ArticleFournisseursManagement({ articleId, articleNom }: ArticleFournisseursManagementProps) {
  const [articleFournisseurs, setArticleFournisseurs] = useState<ArticleFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ArticleFournisseur | null>(null);
  const [formData, setFormData] = useState({
    fournisseur_id: "",
    prix_fournisseur: "",
    reference_fournisseur: "",
    delai_livraison: "",
    quantite_minimum: "1",
    est_principal: false,
    notes: "",
  });

  const { toast } = useToast();

  const fetchArticleFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('article_fournisseurs')
        .select(`
          *,
          fournisseurs (
            id,
            nom,
            email,
            telephone
          )
        `)
        .eq('article_id', articleId)
        .eq('actif', true)
        .order('est_principal', { ascending: false });

      if (error) throw error;
      setArticleFournisseurs(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les fournisseurs de l'article",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('id, nom, email, telephone')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
    }
  };

  useEffect(() => {
    fetchArticleFournisseurs();
    fetchFournisseurs();
  }, [articleId]);

  const resetForm = () => {
    setFormData({
      fournisseur_id: "",
      prix_fournisseur: "",
      reference_fournisseur: "",
      delai_livraison: "",
      quantite_minimum: "1",
      est_principal: false,
      notes: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('article_fournisseurs')
        .insert([{
          article_id: articleId,
          fournisseur_id: formData.fournisseur_id,
          prix_fournisseur: formData.prix_fournisseur ? parseFloat(formData.prix_fournisseur) : null,
          reference_fournisseur: formData.reference_fournisseur || null,
          delai_livraison: formData.delai_livraison ? parseInt(formData.delai_livraison) : null,
          quantite_minimum: parseInt(formData.quantite_minimum) || 1,
          est_principal: formData.est_principal,
          notes: formData.notes || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur ajouté avec succès",
      });

      resetForm();
      setOpenCreateDialog(false);
      fetchArticleFournisseurs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le fournisseur",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('article_fournisseurs')
        .update({
          prix_fournisseur: formData.prix_fournisseur ? parseFloat(formData.prix_fournisseur) : null,
          reference_fournisseur: formData.reference_fournisseur || null,
          delai_livraison: formData.delai_livraison ? parseInt(formData.delai_livraison) : null,
          quantite_minimum: parseInt(formData.quantite_minimum) || 1,
          est_principal: formData.est_principal,
          notes: formData.notes || null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur modifié avec succès",
      });

      resetForm();
      setOpenEditDialog(false);
      setEditingItem(null);
      fetchArticleFournisseurs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le fournisseur",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('article_fournisseurs')
        .update({ actif: false })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur retiré avec succès",
      });

      fetchArticleFournisseurs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le fournisseur",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (item: ArticleFournisseur) => {
    setEditingItem(item);
    setFormData({
      fournisseur_id: item.fournisseur_id,
      prix_fournisseur: item.prix_fournisseur?.toString() || "",
      reference_fournisseur: item.reference_fournisseur || "",
      delai_livraison: item.delai_livraison?.toString() || "",
      quantite_minimum: item.quantite_minimum.toString(),
      est_principal: item.est_principal,
      notes: item.notes || "",
    });
    setOpenEditDialog(true);
  };

  const getAvailableFournisseurs = () => {
    const usedFournisseurIds = articleFournisseurs.map(af => af.fournisseur_id);
    return fournisseurs.filter(f => !usedFournisseurIds.includes(f.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Chargement des fournisseurs...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Fournisseurs - {articleNom}</CardTitle>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={getAvailableFournisseurs().length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un fournisseur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fournisseur">Fournisseur *</Label>
                  <Select
                    value={formData.fournisseur_id}
                    onValueChange={(value) => setFormData({ ...formData, fournisseur_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFournisseurs().map((fournisseur) => (
                        <SelectItem key={fournisseur.id} value={fournisseur.id}>
                          {fournisseur.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prix">Prix fournisseur (€)</Label>
                    <Input
                      id="prix"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.prix_fournisseur}
                      onChange={(e) => setFormData({ ...formData, prix_fournisseur: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Référence fournisseur</Label>
                    <Input
                      id="reference"
                      value={formData.reference_fournisseur}
                      onChange={(e) => setFormData({ ...formData, reference_fournisseur: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delai">Délai livraison (jours)</Label>
                    <Input
                      id="delai"
                      type="number"
                      min="0"
                      value={formData.delai_livraison}
                      onChange={(e) => setFormData({ ...formData, delai_livraison: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantite">Quantité minimum</Label>
                    <Input
                      id="quantite"
                      type="number"
                      min="1"
                      value={formData.quantite_minimum}
                      onChange={(e) => setFormData({ ...formData, quantite_minimum: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="principal"
                    checked={formData.est_principal}
                    onCheckedChange={(checked) => setFormData({ ...formData, est_principal: checked as boolean })}
                  />
                  <Label htmlFor="principal">Fournisseur principal</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Ajouter</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {articleFournisseurs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun fournisseur configuré pour cet article
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Délai</TableHead>
                <TableHead>Qté min</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articleFournisseurs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.est_principal && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      <span className="font-medium">{item.fournisseurs?.nom}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.prix_fournisseur ? `€${item.prix_fournisseur.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>{item.reference_fournisseur || "-"}</TableCell>
                  <TableCell>
                    {item.delai_livraison ? `${item.delai_livraison}j` : "-"}
                  </TableCell>
                  <TableCell>{item.quantite_minimum}</TableCell>
                  <TableCell>
                    <Badge variant={item.est_principal ? "default" : "secondary"}>
                      {item.est_principal ? "Principal" : "Secondaire"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditForm(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir retirer "{item.fournisseurs?.nom}" des fournisseurs de cet article ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Retirer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Dialog d'édition */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le fournisseur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-prix">Prix fournisseur (€)</Label>
                  <Input
                    id="edit-prix"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix_fournisseur}
                    onChange={(e) => setFormData({ ...formData, prix_fournisseur: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reference">Référence fournisseur</Label>
                  <Input
                    id="edit-reference"
                    value={formData.reference_fournisseur}
                    onChange={(e) => setFormData({ ...formData, reference_fournisseur: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-delai">Délai livraison (jours)</Label>
                  <Input
                    id="edit-delai"
                    type="number"
                    min="0"
                    value={formData.delai_livraison}
                    onChange={(e) => setFormData({ ...formData, delai_livraison: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantite">Quantité minimum</Label>
                  <Input
                    id="edit-quantite"
                    type="number"
                    min="1"
                    value={formData.quantite_minimum}
                    onChange={(e) => setFormData({ ...formData, quantite_minimum: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-principal"
                  checked={formData.est_principal}
                  onCheckedChange={(checked) => setFormData({ ...formData, est_principal: checked as boolean })}
                />
                <Label htmlFor="edit-principal">Fournisseur principal</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">Modifier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}