import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Pencil, Trash2, Mail } from "lucide-react";

const mailSettingsSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  smtp_host: z.string().min(1, "L'hôte SMTP est requis"),
  smtp_port: z.number().min(1).max(65535),
  smtp_username: z.string().min(1, "Le nom d'utilisateur SMTP est requis"),
  smtp_password: z.string().min(1, "Le mot de passe SMTP est requis"),
  imap_host: z.string().optional(),
  imap_port: z.number().min(1).max(65535).optional(),
  imap_username: z.string().optional(),
  imap_password: z.string().optional(),
  use_tls: z.boolean(),
  is_active: z.boolean(),
});

type MailSettingsFormData = z.infer<typeof mailSettingsSchema>;

interface MailSetting {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password?: string;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  use_tls: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function MailSettingsForm() {
  const [mailSettings, setMailSettings] = useState<MailSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<MailSettingsFormData>({
    resolver: zodResolver(mailSettingsSchema),
    defaultValues: {
      name: "",
      smtp_host: "",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      imap_host: "",
      imap_port: 993,
      imap_username: "",
      imap_password: "",
      use_tls: true,
      is_active: false,
    },
  });

  const fetchMailSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("mail_settings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMailSettings(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de messagerie",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMailSettings();
  }, [user]);

  const onSubmit = async (data: MailSettingsFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("mail_settings")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Paramètres de messagerie mis à jour",
        });
      } else {
        const { error } = await supabase
          .from("mail_settings")
          .insert({
            name: data.name,
            smtp_host: data.smtp_host,
            smtp_port: data.smtp_port,
            smtp_username: data.smtp_username,
            smtp_password: data.smtp_password,
            imap_host: data.imap_host || null,
            imap_port: data.imap_port || null,
            imap_username: data.imap_username || null,
            imap_password: data.imap_password || null,
            use_tls: data.use_tls,
            is_active: data.is_active,
            user_id: user.id
          });

        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Paramètres de messagerie ajoutés",
        });
      }

      form.reset();
      setEditingId(null);
      setShowForm(false);
      fetchMailSettings();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editMailSetting = (setting: MailSetting) => {
    form.reset({
      name: setting.name,
      smtp_host: setting.smtp_host,
      smtp_port: setting.smtp_port,
      smtp_username: setting.smtp_username,
      smtp_password: "", // Ne pas pré-remplir le mot de passe pour la sécurité
      imap_host: setting.imap_host || "",
      imap_port: setting.imap_port || 993,
      imap_username: setting.imap_username || "",
      imap_password: "", // Ne pas pré-remplir le mot de passe pour la sécurité
      use_tls: setting.use_tls,
      is_active: setting.is_active,
    });
    setEditingId(setting.id);
    setShowForm(true);
  };

  const deleteMailSetting = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("mail_settings")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paramètres de messagerie supprimés",
      });
      fetchMailSettings();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les paramètres",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("mail_settings")
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      fetchMailSettings();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Liste des paramètres existants */}
      {mailSettings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Comptes configurés</h3>
          {mailSettings.map((setting) => (
            <Card key={setting.id} className={setting.is_active ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{setting.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{setting.smtp_host}:{setting.smtp_port}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={() => toggleActive(setting.id, setting.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editMailSetting(setting)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMailSetting(setting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Options de connexion */}
      {!showForm && (
        <div className="space-y-3">
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Connexion rapide Gmail
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Connectez votre compte Gmail en un clic avec OAuth. Plus simple et plus sécurisé que la configuration SMTP manuelle.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setIsConnectingGmail(true);
                  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
                  const scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";
                  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
                  window.location.href = authUrl;
                }}
                disabled={isConnectingGmail}
                className="shrink-0"
              >
                {isConnectingGmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Mail className="h-4 w-4 mr-2" />
                Connecter Gmail
              </Button>
            </div>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Configuration SMTP manuelle (OVH, Outlook, etc.)
          </Button>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? "Modifier le compte" : "Nouveau compte de messagerie"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du compte</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ex: Gmail professionnel"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <Separator />
              <h4 className="font-medium">Paramètres SMTP (envoi)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">Serveur SMTP</Label>
                  <Input
                    id="smtp_host"
                    {...form.register("smtp_host")}
                    placeholder="smtp.gmail.com"
                  />
                  {form.formState.errors.smtp_host && (
                    <p className="text-sm text-destructive">{form.formState.errors.smtp_host.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="smtp_port">Port SMTP</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    {...form.register("smtp_port", { valueAsNumber: true })}
                    placeholder="587"
                  />
                  {form.formState.errors.smtp_port && (
                    <p className="text-sm text-destructive">{form.formState.errors.smtp_port.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="smtp_username">Nom d'utilisateur SMTP</Label>
                <Input
                  id="smtp_username"
                  {...form.register("smtp_username")}
                  placeholder="votre-email@domaine.com"
                />
                {form.formState.errors.smtp_username && (
                  <p className="text-sm text-destructive">{form.formState.errors.smtp_username.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="smtp_password">Mot de passe SMTP</Label>
                <PasswordInput
                  id="smtp_password"
                  {...form.register("smtp_password")}
                  placeholder="Votre mot de passe ou mot de passe d'application"
                />
                {form.formState.errors.smtp_password && (
                  <p className="text-sm text-destructive">{form.formState.errors.smtp_password.message}</p>
                )}
              </div>

              <Separator />
              <h4 className="font-medium">Paramètres IMAP (réception) - Optionnel</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imap_host">Serveur IMAP</Label>
                  <Input
                    id="imap_host"
                    {...form.register("imap_host")}
                    placeholder="imap.gmail.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="imap_port">Port IMAP</Label>
                  <Input
                    id="imap_port"
                    type="number"
                    {...form.register("imap_port", { valueAsNumber: true })}
                    placeholder="993"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="imap_username">Nom d'utilisateur IMAP</Label>
                <Input
                  id="imap_username"
                  {...form.register("imap_username")}
                  placeholder="votre-email@domaine.com"
                />
              </div>

              <div>
                <Label htmlFor="imap_password">Mot de passe IMAP</Label>
                <PasswordInput
                  id="imap_password"
                  {...form.register("imap_password")}
                  placeholder="Votre mot de passe ou mot de passe d'application"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="use_tls"
                  {...form.register("use_tls")}
                />
                <Label htmlFor="use_tls">Utiliser TLS/SSL</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  {...form.register("is_active")}
                />
                <Label htmlFor="is_active">Compte actif</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Mettre à jour" : "Sauvegarder"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                form.reset();
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}