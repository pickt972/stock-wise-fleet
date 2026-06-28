import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, User, Lock, Shield } from "lucide-react";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  magasinier: "Magasinier",
  chef_agence: "Chef d'agence",
  admin: "Administrateur",
};

export default function CreateUserDialog({ isOpen, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "magasinier" as UserRole,
  });
  const { toast } = useToast();

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    if (!formData.email.includes("@")) {
      toast({ title: "Email invalide", description: "Saisissez une adresse email valide (ex: prenom@domaine.com).", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          role: formData.role,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Utilisateur créé",
        description: `${formData.firstName} ${formData.lastName} (${formData.email}) — ${ROLE_LABELS[formData.role]}`,
      });

      setFormData({ email: "", password: "", firstName: "", lastName: "", role: "magasinier" });
      onUserCreated();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error?.message || "";
      const friendlyMsg =
        msg.includes("already") || msg.includes("duplicate")
          ? "Cette adresse email est déjà utilisée."
          : msg.includes("invalid_email")
          ? "Adresse email invalide."
          : msg || "Impossible de créer l'utilisateur.";

      toast({ title: "Erreur", description: friendlyMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>
            L'utilisateur recevra ses identifiants et pourra réinitialiser son mot de passe par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Adresse email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cu-email"
                type="email"
                placeholder="prenom.nom@domaine.com"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cet email servira à la connexion et aux réinitialisations de mot de passe.
            </p>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Mot de passe temporaire <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cu-password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={formData.password}
                onChange={(e) => update("password", e.target.value)}
                className="pl-9"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-firstName">Prénom <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cu-firstName"
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-lastName">Nom <span className="text-destructive">*</span></Label>
              <Input
                id="cu-lastName"
                placeholder="Nom"
                value={formData.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </div>
          </div>

          {/* Rôle */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Rôle</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <Select
                value={formData.role}
                onValueChange={(value) => update("role", value)}
              >
                <SelectTrigger className="pl-9">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer l'utilisateur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
