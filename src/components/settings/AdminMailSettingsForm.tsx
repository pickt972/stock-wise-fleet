import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Trash2, Mail, User } from "lucide-react";

interface MailSetting {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  use_tls: boolean;
  is_active: boolean;
  auth_type: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export function AdminMailSettingsForm() {
  const [mailSettings, setMailSettings] = useState<MailSetting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [settingToDelete, setSettingToDelete] = useState<MailSetting | null>(null);
  const [settingToEdit, setSettingToEdit] = useState<MailSetting | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    use_tls: true,
    is_active: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: settings }, { data: profiles }] = await Promise.all([
        supabase
          .from("mail_settings")
          .select("id, name, smtp_host, smtp_port, smtp_username, use_tls, is_active, auth_type, user_id")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, first_name, last_name").order("first_name"),
      ]);
      setMailSettings(settings || []);
      setUsers(profiles || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : "Inconnu";
  };

  const filteredSettings =
    selectedUserId === "all"
      ? mailSettings
      : mailSettings.filter((s) => s.user_id === selectedUserId);

  const handleDelete = async () => {
    if (!settingToDelete) return;
    try {
      const { error } = await supabase.from("mail_settings").delete().eq("id", settingToDelete.id);
      if (error) throw error;
      toast({ title: "Compte mail supprimé" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSettingToDelete(null);
    }
  };

  const handleToggleActive = async (setting: MailSetting) => {
    try {
      const { error } = await supabase
        .from("mail_settings")
        .update({ is_active: !setting.is_active, updated_at: new Date().toISOString() })
        .eq("id", setting.id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (setting: MailSetting) => {
    setSettingToEdit(setting);
    setEditForm({
      name: setting.name,
      smtp_host: setting.smtp_host,
      smtp_port: setting.smtp_port,
      smtp_username: setting.smtp_username,
      smtp_password: "",
      use_tls: setting.use_tls,
      is_active: setting.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!settingToEdit) return;
    setIsSaving(true);
    try {
      const updateData: any = {
        name: editForm.name,
        smtp_host: editForm.smtp_host,
        smtp_port: editForm.smtp_port,
        smtp_username: editForm.smtp_username,
        use_tls: editForm.use_tls,
        is_active: editForm.is_active,
        updated_at: new Date().toISOString(),
      };
      if (editForm.smtp_password) {
        updateData.smtp_password = editForm.smtp_password;
      }
      const { error } = await supabase.from("mail_settings").update(updateData).eq("id", settingToEdit.id);
      if (error) throw error;
      toast({ title: "Compte mail mis à jour" });
      setSettingToEdit(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Unique users that have mail settings
  const usersWithMail = [...new Set(mailSettings.map((s) => s.user_id))];

  if (isLoading) return <div className="text-center py-4 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Filtrer par utilisateur</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les utilisateurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {usersWithMail.map((uid) => (
              <SelectItem key={uid} value={uid}>
                {getUserName(uid)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredSettings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucun compte de messagerie configuré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSettings.map((setting) => (
            <Card key={setting.id} className={setting.is_active ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{setting.name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {setting.smtp_username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {getUserName(setting.user_id)}
                      </Badge>
                      <Badge variant={setting.auth_type === "oauth" ? "default" : "secondary"} className="text-xs">
                        {setting.auth_type === "oauth" ? "OAuth" : "SMTP"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={() => handleToggleActive(setting)}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(setting)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setSettingToDelete(setting)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!settingToEdit} onOpenChange={() => setSettingToEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le compte mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du compte</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Serveur SMTP</Label>
                <Input value={editForm.smtp_host} onChange={(e) => setEditForm({ ...editForm, smtp_host: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input type="number" value={editForm.smtp_port} onChange={(e) => setEditForm({ ...editForm, smtp_port: parseInt(e.target.value) || 587 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom d'utilisateur SMTP</Label>
              <Input value={editForm.smtp_username} onChange={(e) => setEditForm({ ...editForm, smtp_username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
              <PasswordInput value={editForm.smtp_password} onChange={(e) => setEditForm({ ...editForm, smtp_password: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>TLS</Label>
              <Switch checked={editForm.use_tls} onCheckedChange={(v) => setEditForm({ ...editForm, use_tls: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Actif</Label>
              <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
            </div>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!settingToDelete} onOpenChange={() => setSettingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte mail ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte <strong>{settingToDelete?.name}</strong> de{" "}
              <strong>{settingToDelete ? getUserName(settingToDelete.user_id) : ""}</strong> sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
