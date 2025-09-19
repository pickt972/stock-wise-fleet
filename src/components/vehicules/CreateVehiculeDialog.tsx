import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CreateVehiculeDialogProps {
  onVehiculeCreated: () => void;
  onVehiculeSelected?: (vehiculeId: string) => void;
}

export function CreateVehiculeDialog({ onVehiculeCreated, onVehiculeSelected }: CreateVehiculeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    motorisation: "",
    annee: "",
    notes: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();

  const formatImmatriculation = (value: string) => {
    // Supprimer tous les caractères non alphanumériques et convertir en majuscules
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Appliquer le format XX-XXX-XX
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}`;
    }
  };

  const createVehicule = async () => {
    if (!formData.immatriculation || !formData.marque || !formData.modele) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('vehicules')
        .insert([{
          immatriculation: formData.immatriculation,
          marque: formData.marque,
          modele: formData.modele,
          motorisation: formData.motorisation || null,
          annee: formData.annee ? parseInt(formData.annee) : null,
          notes: formData.notes || null,
          user_id: user?.id,
          actif: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le véhicule a été créé avec succès",
      });

      // Sélectionner automatiquement le nouveau véhicule si callback fourni
      if (onVehiculeSelected && data) {
        onVehiculeSelected(data.id);
      }

      // Réinitialiser le formulaire
      setFormData({
        immatriculation: "",
        marque: "",
        modele: "",
        motorisation: "",
        annee: "",
        notes: "",
      });

      setIsOpen(false);
      onVehiculeCreated();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le véhicule",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Nouveau véhicule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau véhicule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="immatriculation">Immatriculation *</Label>
            <Input
              id="immatriculation"
              value={formData.immatriculation}
              onChange={(e) => {
                const formatted = formatImmatriculation(e.target.value);
                setFormData(prev => ({ ...prev, immatriculation: formatted }));
              }}
              placeholder="AB-123-CD"
              maxLength={9}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marque">Marque *</Label>
              <Input
                id="marque"
                value={formData.marque}
                onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                placeholder="Renault"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modele">Modèle *</Label>
              <Input
                id="modele"
                value={formData.modele}
                onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                placeholder="Clio"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="motorisation">Motorisation</Label>
              <Input
                id="motorisation"
                value={formData.motorisation}
                onChange={(e) => setFormData(prev => ({ ...prev, motorisation: e.target.value }))}
                placeholder="1.5 dCi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.annee}
                onChange={(e) => setFormData(prev => ({ ...prev, annee: e.target.value }))}
                placeholder="2020"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires..."
            />
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
              onClick={createVehicule}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              {isCreating ? "Création..." : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}