import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
}

interface EditUserDialogProps {
  user: UserProfile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export default function EditUserDialog({ user, isOpen, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{ firstName: string; lastName: string; username: string; role: UserRole }>({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    username: user?.username || "",
    role: (user?.role as UserRole) || "magasinier",
  });
  const { toast } = useToast();

  // Mettre à jour le formData quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !formData.firstName || !formData.lastName || !formData.username) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Mettre à jour le rôle
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: formData.role })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      toast({
        title: "Utilisateur modifié",
        description: "Les informations ont été mises à jour avec succès",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'utilisateur",
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
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations de {user?.first_name} {user?.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Nom d'utilisateur</Label>
            <Input
              id="edit-username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="nom_utilisateur"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Prénom</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Nom</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Nom"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Rôle</Label>
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
            Modifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}