import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export default function CreateUserDialog({ isOpen, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{ 
    username: string; 
    password: string;
    firstName: string; 
    lastName: string; 
    role: UserRole 
  }>({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "magasinier",
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.username || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
        }
      });

      if (error) throw error;

      toast({
        title: "Utilisateur créé",
        description: `${formData.firstName} ${formData.lastName} a été créé avec succès`,
      });

      // Reset form
      setFormData({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "magasinier",
      });

      onUserCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur création utilisateur:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>
            Créez un nouveau compte utilisateur
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-username">Nom d'utilisateur</Label>
            <Input
              id="create-username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="nom_utilisateur"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Mot de passe</Label>
            <Input
              id="create-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-firstName">Prénom</Label>
              <Input
                id="create-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Nom</Label>
              <Input
                id="create-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Nom"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">Rôle</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData({...formData, role: value as UserRole})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="magasinier">Magasinier</SelectItem>
                <SelectItem value="chef_agence">Chef d'agence</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
