import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface CreateCategorieDialogProps {
  onCategorieCreated: (categorieName: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateCategorieDialog({ onCategorieCreated, trigger, open, onOpenChange }: CreateCategorieDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    actif: true,
  });
  const { toast } = useToast();

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la catégorie est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          nom: formData.nom.trim(),
          description: formData.description.trim() || null,
          actif: formData.actif,
          user_id: userData?.user?.id
        }])
        .select('nom')
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });

      setFormData({
        nom: "",
        description: "",
        actif: true,
      });

      setIsOpen(false);
      if (data?.nom) {
        onCategorieCreated(data.nom);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la catégorie",
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
            Nouvelle catégorie
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border shadow-large z-[70]">
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Nom de la catégorie"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la catégorie"
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
