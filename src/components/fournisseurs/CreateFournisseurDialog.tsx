import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface CreateFournisseurDialogProps {
  onFournisseurCreated: (fournisseurId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateFournisseurDialog({ onFournisseurCreated, trigger }: CreateFournisseurDialogProps) {
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
      const { data, error } = await supabase
        .from('fournisseurs')
        .insert([formData])
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Fournisseur créé avec succès",
      });

      setFormData({
        nom: "",
        email: "",
        telephone: "",
        adresse: "",
        contact_principal: "",
        notes: "",
        actif: true,
      });

      setIsOpen(false);
      if (data?.id) {
        onFournisseurCreated(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le fournisseur",
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
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border shadow-large">
        <DialogHeader>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Nom du fournisseur"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@fournisseur.fr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              placeholder="01 23 45 67 89"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Textarea
              id="adresse"
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              placeholder="Adresse complète"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_principal">Contact principal</Label>
            <Input
              id="contact_principal"
              value={formData.contact_principal}
              onChange={(e) => setFormData({ ...formData, contact_principal: e.target.value })}
              placeholder="Nom du contact"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="actif"
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
            />
            <Label htmlFor="actif">Actif</Label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
