import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface FournisseurDialogProps {
  fournisseur?: Fournisseur;
  onSave: () => void;
  trigger?: React.ReactNode;
}

const FournisseurDialog = ({ fournisseur, onSave, trigger }: FournisseurDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    contact_principal: "",
    notes: "",
    actif: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (fournisseur) {
      setFormData({
        nom: fournisseur.nom || "",
        email: fournisseur.email || "",
        telephone: fournisseur.telephone || "",
        adresse: fournisseur.adresse || "",
        contact_principal: fournisseur.contact_principal || "",
        notes: fournisseur.notes || "",
        actif: fournisseur.actif,
      });
    }
  }, [fournisseur]);

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du fournisseur est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (fournisseur) {
        // Modification
        const { error } = await supabase
          .from('fournisseurs')
          .update(formData)
          .eq('id', fournisseur.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Fournisseur modifié avec succès",
        });
      } else {
        // Création
        const { error } = await supabase
          .from('fournisseurs')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Fournisseur créé avec succès",
        });
      }

      setIsOpen(false);
      setFormData({
        nom: "",
        email: "",
        telephone: "",
        adresse: "",
        contact_principal: "",
        notes: "",
        actif: true,
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Nom du fournisseur"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contact@fournisseur.com"
            />
          </div>
          
          <div>
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
              placeholder="01 23 45 67 89"
            />
          </div>
          
          <div>
            <Label htmlFor="contact_principal">Contact principal</Label>
            <Input
              id="contact_principal"
              value={formData.contact_principal}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_principal: e.target.value }))}
              placeholder="Nom du contact"
            />
          </div>
          
          <div>
            <Label htmlFor="adresse">Adresse</Label>
            <Textarea
              id="adresse"
              value={formData.adresse}
              onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
              placeholder="Adresse complète"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes et commentaires"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="actif"
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
            />
            <Label htmlFor="actif">Fournisseur actif</Label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FournisseursManagement = () => {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const deleteFournisseur = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fournisseurs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur supprimé",
      });
      fetchFournisseurs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Chargement des fournisseurs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Gestion des fournisseurs
        </h2>
        <FournisseurDialog onSave={fetchFournisseurs} />
      </div>

      {fournisseurs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucun fournisseur enregistré
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.map((fournisseur) => (
                <TableRow key={fournisseur.id}>
                  <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                  <TableCell>{fournisseur.contact_principal || "-"}</TableCell>
                  <TableCell>{fournisseur.email || "-"}</TableCell>
                  <TableCell>{fournisseur.telephone || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      fournisseur.actif 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {fournisseur.actif ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <FournisseurDialog
                        fournisseur={fournisseur}
                        onSave={fetchFournisseurs}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFournisseur(fournisseur.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};