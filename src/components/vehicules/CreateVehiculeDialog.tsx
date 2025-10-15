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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehiculeCreated: () => void;
  onVehiculeSelected?: (vehiculeId: string) => void;
}

export function CreateVehiculeDialog({ open, onOpenChange, onVehiculeCreated, onVehiculeSelected }: CreateVehiculeDialogProps) {
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
    
    // Format français standard: AA-000-AA (2 lettres, 3 chiffres, 2 lettres)
    let formatted = '';
    
    for (let i = 0; i < cleaned.length && i < 7; i++) {
      // Ajouter les tirets aux bonnes positions
      if (i === 2 || i === 5) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    
    return formatted;
  };

  const validateImmatriculation = (value: string) => {
    // Regex pour valider le format français AA-000-AA
    const regex = /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/;
    return regex.test(value);
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

    // Vérifier le format de l'immatriculation
    if (!validateImmatriculation(formData.immatriculation)) {
      toast({
        title: "Erreur",
        description: "Le format de l'immatriculation doit être AA-000-AA",
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

      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              className={formData.immatriculation && !validateImmatriculation(formData.immatriculation) 
                ? "border-destructive focus:border-destructive" 
                : ""
              }
            />
            <p className="text-xs text-muted-foreground">
              Format: AA-000-AA (2 lettres, 3 chiffres, 2 lettres)
            </p>
            {formData.immatriculation && !validateImmatriculation(formData.immatriculation) && (
              <p className="text-xs text-destructive">
                Format d'immatriculation invalide
              </p>
            )}
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
              onClick={() => onOpenChange(false)}
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