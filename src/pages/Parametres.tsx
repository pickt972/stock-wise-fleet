import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Users, Truck, MapPin, Building2, Tags, Mail, Building, 
  Shield, BarChart3, History, KeyRound, ClipboardList, Bell, Palette, Baby, UserCog
} from "lucide-react";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { ColorPreferencesSettings } from "@/components/settings/ColorPreferencesSettings";
import { AdminResetPasswordForm } from "@/components/settings/AdminResetPasswordForm";
import { AdminMailSettingsForm } from "@/components/settings/AdminMailSettingsForm";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function SettingsCard({ icon, title, description, onClick, index = 0 }: SettingsCardProps & { index?: number }) {
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 active:scale-[0.98] group animate-fade-in opacity-0 [animation-fill-mode:forwards]"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function NotificationSettingsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_enabled: true,
    notify_on_low_stock: true,
    notify_on_critical_stock: true,
    notify_on_order_sent: false,
    notify_on_order_received: true,
    notify_on_inventory_completed: false,
    low_stock_threshold: 5,
    critical_stock_threshold: 2,
    notification_email: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          email_enabled: data.email_enabled ?? true,
          notify_on_low_stock: data.notify_on_low_stock ?? true,
          notify_on_critical_stock: data.notify_on_critical_stock ?? true,
          notify_on_order_sent: data.notify_on_order_sent ?? false,
          notify_on_order_received: data.notify_on_order_received ?? true,
          notify_on_inventory_completed: data.notify_on_inventory_completed ?? false,
          low_stock_threshold: data.low_stock_threshold ?? 5,
          critical_stock_threshold: data.critical_stock_threshold ?? 2,
          notification_email: data.notification_email ?? "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("notification_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = { ...settings, user_id: user.id, updated_at: new Date().toISOString() };
    let error;
    if (existing) {
      ({ error } = await supabase.from("notification_settings").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("notification_settings").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paramètres sauvegardés ✓" });
    }
  };

  if (loading) return <div className="text-center py-4 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Notifications par email</Label>
            <p className="text-xs text-muted-foreground">Recevoir les alertes par email</p>
          </div>
          <Switch checked={settings.email_enabled} onCheckedChange={v => setSettings(s => ({ ...s, email_enabled: v }))} />
        </div>
        {settings.email_enabled && (
          <div className="space-y-2">
            <Label>Email de notification</Label>
            <Input value={settings.notification_email} onChange={e => setSettings(s => ({ ...s, notification_email: e.target.value }))} placeholder="email@example.com" />
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Types de notification</h3>
        {[
          { key: "notify_on_low_stock", label: "Stock faible", desc: "Quand un article passe sous le seuil minimum" },
          { key: "notify_on_critical_stock", label: "Stock critique", desc: "Quand un article est presque en rupture" },
          { key: "notify_on_order_sent", label: "Commande envoyée", desc: "Confirmation d'envoi de bon de commande" },
          { key: "notify_on_order_received", label: "Commande reçue", desc: "Quand une commande est réceptionnée" },
          { key: "notify_on_inventory_completed", label: "Inventaire terminé", desc: "Quand un inventaire est clôturé" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-1">
            <div>
              <Label className="text-sm">{item.label}</Label>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={(settings as any)[item.key]}
              onCheckedChange={v => setSettings(s => ({ ...s, [item.key]: v }))}
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Seuils d'alerte</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Seuil stock faible</Label>
            <Input type="number" min={1} value={settings.low_stock_threshold}
              onChange={e => setSettings(s => ({ ...s, low_stock_threshold: parseInt(e.target.value) || 5 }))} />
            <p className="text-xs text-muted-foreground">Alerte quand stock ≤ cette valeur</p>
          </div>
          <div className="space-y-2">
            <Label>Seuil stock critique</Label>
            <Input type="number" min={0} value={settings.critical_stock_threshold}
              onChange={e => setSettings(s => ({ ...s, critical_stock_threshold: parseInt(e.target.value) || 2 }))} />
            <p className="text-xs text-muted-foreground">Alerte critique quand stock ≤ cette valeur</p>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
      </Button>
    </div>
  );
}

export default function Parametres() {
  const { permissions, isMagasinier } = useRoleAccess();
  const navigate = useNavigate();
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showMailSettings, setShowMailSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showAdminReset, setShowAdminReset] = useState(false);
  const [showAdminMail, setShowAdminMail] = useState(false);

  useEffect(() => {
    document.title = "Paramètres | StockAuto";
  }, []);

  if (isMagasinier()) {
    return (
      <DashboardLayout>
        <main className="space-y-4 max-w-3xl mx-auto">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight">Paramètres</h1>
            <p className="text-[14px] text-muted-foreground mt-1">Mon profil</p>
          </div>
          <ChangePasswordForm />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight">Paramètres</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Configuration de l'application</p>
        </div>

        {/* Mon compte */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Mon compte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingsCard
              index={0}
              icon={<KeyRound className="h-5 w-5" />}
              title="Mot de passe"
              description="Modifier mon mot de passe"
              onClick={() => setShowPassword(true)}
            />
            <SettingsCard
              index={1}
              icon={<Palette className="h-5 w-5" />}
              title="Couleurs"
              description="Personnaliser les couleurs"
              onClick={() => setShowColors(true)}
            />
          </div>
        </section>

        {/* Données */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Données</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissions.manageUsers && (
              <SettingsCard
                index={2}
                icon={<Users className="h-5 w-5" />}
                title="Utilisateurs"
                description="Gérer les comptes et rôles"
                onClick={() => navigate('/users')}
              />
            )}
            {permissions.manageSuppliers && (
              <SettingsCard
                index={3}
                icon={<Building2 className="h-5 w-5" />}
                title="Fournisseurs"
                description="Gérer les fournisseurs"
                onClick={() => navigate('/fournisseurs')}
              />
            )}
            {permissions.manageCategories && (
              <>
                <SettingsCard
                  index={4}
                  icon={<Tags className="h-5 w-5" />}
                  title="Catégories"
                  description="Catégories d'articles"
                  onClick={() => navigate('/categories')}
                />
                <SettingsCard
                  index={5}
                  icon={<Tags className="h-5 w-5" />}
                  title="Sous-catégories"
                  description="Gérer les sous-catégories"
                  onClick={() => navigate('/categories?tab=sous-categories')}
                />
              </>
            )}
            {permissions.manageVehicles && (
              <SettingsCard
                index={5}
                icon={<Truck className="h-5 w-5" />}
                title="Véhicules"
                description="Parc de véhicules"
                onClick={() => navigate('/vehicules')}
              />
            )}
            <SettingsCard
              index={6}
              icon={<MapPin className="h-5 w-5" />}
              title="Emplacements"
              description="Zones de stockage"
              onClick={() => navigate('/emplacements')}
            />
            <SettingsCard
              index={7}
              icon={<Baby className="h-5 w-5" />}
              title="Accessoires"
              description="Sièges bébé, rehausseurs..."
              onClick={() => navigate('/accessoires')}
            />
          </div>
        </section>

        {/* Configuration */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingsCard
              index={8}
              icon={<Building className="h-5 w-5" />}
              title="Entreprise"
              description="Infos pour les bons de commande"
              onClick={() => setShowCompanySettings(true)}
            />
            <SettingsCard
              index={9}
              icon={<Mail className="h-5 w-5" />}
              title="Messagerie"
              description="Configuration email SMTP"
              onClick={() => setShowMailSettings(true)}
            />
            <SettingsCard
              index={10}
              icon={<Bell className="h-5 w-5" />}
              title="Notifications"
              description="Alertes et seuils de stock"
              onClick={() => setShowNotifications(true)}
            />
            <SettingsCard
              index={10}
              icon={<Bell className="h-5 w-5" />}
              title="Seuils agrégés"
              description="Stock min par sous-catégorie/véhicule"
              onClick={() => navigate('/seuils-stock')}
            />
          </div>
        </section>

        {/* Administration */}
        {permissions.manageUsers && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Administration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SettingsCard
                index={11}
                icon={<Shield className="h-5 w-5" />}
                title="Rôles & Permissions"
                description="Matrice des droits"
                onClick={() => navigate('/roles-permissions')}
              />
              <SettingsCard
                index={12}
                icon={<UserCog className="h-5 w-5" />}
                title="Réinitialiser un mot de passe"
                description="Changer le MDP d'un utilisateur"
                onClick={() => setShowAdminReset(true)}
              />
              <SettingsCard
                index={13}
                icon={<Mail className="h-5 w-5" />}
                title="Boîtes mail utilisateurs"
                description="Gérer les comptes mail de tous"
                onClick={() => setShowAdminMail(true)}
              />
              <SettingsCard
                index={13}
                icon={<BarChart3 className="h-5 w-5" />}
                title="Rapports"
                description="Rapports et statistiques"
                onClick={() => navigate('/rapports')}
              />
              <SettingsCard
                index={14}
                icon={<ClipboardList className="h-5 w-5" />}
                title="Journal d'audit"
                description="Traçabilité des actions"
                onClick={() => navigate('/journal-audit')}
              />
              <SettingsCard
                index={15}
                icon={<History className="h-5 w-5" />}
                title="Historique articles"
                description="Suivi détaillé par article"
                onClick={() => navigate('/historique-articles')}
              />
            </div>
          </section>
        )}
      </main>

      <Dialog open={showCompanySettings} onOpenChange={setShowCompanySettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Informations de l'entreprise</DialogTitle>
          </DialogHeader>
          <CompanySettingsForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showMailSettings} onOpenChange={setShowMailSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration de la messagerie</DialogTitle>
          </DialogHeader>
          <MailSettingsForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showPassword} onOpenChange={setShowPassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
          </DialogHeader>
          <ChangePasswordForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Paramètres de notification</DialogTitle>
          </DialogHeader>
          <NotificationSettingsForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showColors} onOpenChange={setShowColors}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personnalisation des couleurs</DialogTitle>
          </DialogHeader>
          <ColorPreferencesSettings />
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminReset} onOpenChange={setShowAdminReset}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser un mot de passe</DialogTitle>
          </DialogHeader>
          <AdminResetPasswordForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminMail} onOpenChange={setShowAdminMail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des boîtes mail</DialogTitle>
          </DialogHeader>
          <AdminMailSettingsForm />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
