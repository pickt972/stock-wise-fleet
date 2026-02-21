import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Building2, Mail, Phone, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  contact_principal?: string;
  notes?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export const FournisseursManagement = () => {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    contact_principal: "",
    notes: "",
    actif: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchFournisseurs = async () => {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('*')
        .order('nom');

      if (error) throw error;
      setFournisseurs(data || []);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.contact_principal || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ nom: "", email: "", telephone: "", adresse: "", contact_principal: "", notes: "", actif: true });
  };

  const handleCreate = async () => {
    if (!formData.nom.trim()) {
      toast({ title: "Erreur", description: "Le nom du fournisseur est obligatoire", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('fournisseurs').insert([formData]);
      if (error) throw error;
      toast({ title: "Succès", description: "Fournisseur créé avec succès" });
      resetForm();
      setOpenCreateDialog(false);
      fetchFournisseurs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingFournisseur || !formData.nom.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('fournisseurs').update(formData).eq('id', editingFournisseur.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Fournisseur modifié avec succès" });
      resetForm();
      setOpenEditDialog(false);
      setEditingFournisseur(null);
      fetchFournisseurs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditForm = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom || "",
      email: fournisseur.email || "",
      telephone: fournisseur.telephone || "",
      adresse: fournisseur.adresse || "",
      contact_principal: fournisseur.contact_principal || "",
      notes: fournisseur.notes || "",
      actif: fournisseur.actif,
    });
    setOpenEditDialog(true);
  };

  const deleteFournisseur = async (id: string) => {
    try {
      const { data: articlesData } = await supabase.from('articles').select('id').eq('fournisseur_id', id).limit(1);
      const { data: associationsData } = await supabase.from('article_fournisseurs').select('id').eq('fournisseur_id', id).limit(1);

      if ((articlesData && articlesData.length > 0) || (associationsData && associationsData.length > 0)) {
        toast({ title: "Suppression impossible", description: "Ce fournisseur est lié à des articles.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('fournisseurs').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Succès", description: "Fournisseur supprimé avec succès" });
      fetchFournisseurs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const FournisseurForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="nom">Nom *</Label>
        <Input id="nom" value={formData.nom} onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))} placeholder="Nom du fournisseur" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@fournisseur.com" />
      </div>
      <div>
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" value={formData.telephone} onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))} placeholder="01 23 45 67 89" />
      </div>
      <div>
        <Label htmlFor="contact_principal">Contact principal</Label>
        <Input id="contact_principal" value={formData.contact_principal} onChange={(e) => setFormData(prev => ({ ...prev, contact_principal: e.target.value }))} placeholder="Nom du contact" />
      </div>
      <div>
        <Label htmlFor="adresse">Adresse</Label>
        <Textarea id="adresse" value={formData.adresse} onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))} placeholder="Adresse complète" rows={2} />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes et commentaires" rows={2} />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="actif" checked={formData.actif} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))} />
        <Label htmlFor="actif">Fournisseur actif</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setOpenCreateDialog(false); setOpenEditDialog(false); }}>Annuler</Button>
        <Button onClick={onSubmit} disabled={isSaving}>{isSaving ? "Enregistrement..." : submitLabel}</Button>
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Chargement...</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input placeholder="Rechercher un fournisseur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-xs" />
        <button
          type="button"
          onClick={() => { resetForm(); setOpenCreateDialog(true); }}
          className="w-full sm:w-auto px-6 py-4 rounded-lg border-2 border-dashed border-border bg-card text-left hover:border-primary/40 hover:bg-muted/50 transition-all"
        >
          <span className="text-base font-medium block text-foreground">
            <Plus className="h-4 w-4 inline mr-2" />
            Nouveau fournisseur
          </span>
          <span className="text-sm text-muted-foreground">Cliquez ici pour ajouter un nouveau fournisseur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((fournisseur, index) => (
          <Card
            key={fournisseur.id}
            className="p-4 flex flex-col gap-3 animate-fade-in opacity-0 [animation-fill-mode:forwards] hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{fournisseur.nom}</span>
              </div>
              <Badge variant={fournisseur.actif ? "default" : "secondary"} className="flex-shrink-0 text-xs">
                {fournisseur.actif ? "Actif" : "Inactif"}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              {fournisseur.contact_principal && (
                <div className="flex items-center gap-2"><User className="h-3 w-3 flex-shrink-0" /><span className="truncate">{fournisseur.contact_principal}</span></div>
              )}
              {fournisseur.email && (
                <div className="flex items-center gap-2"><Mail className="h-3 w-3 flex-shrink-0" /><span className="truncate">{fournisseur.email}</span></div>
              )}
              {fournisseur.telephone && (
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 flex-shrink-0" /><span>{fournisseur.telephone}</span></div>
              )}
              {!fournisseur.contact_principal && !fournisseur.email && !fournisseur.telephone && (
                <p className="text-muted-foreground italic">Aucune info de contact</p>
              )}
            </div>

            <div className="flex justify-end gap-1 mt-auto">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditForm(fournisseur)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>Supprimer le fournisseur "{fournisseur.nom}" ? Cette action est irréversible.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteFournisseur(fournisseur.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Aucun fournisseur trouvé" : "Aucun fournisseur enregistré"}
        </div>
      )}

      {/* Dialog création */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
          <FournisseurForm onSubmit={handleCreate} submitLabel="Créer" />
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier le fournisseur</DialogTitle></DialogHeader>
          <FournisseurForm onSubmit={handleEdit} submitLabel="Modifier" />
        </DialogContent>
      </Dialog>
    </div>
  );
};
