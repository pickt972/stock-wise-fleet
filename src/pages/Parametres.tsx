import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, Truck, MapPin, Building2, Tags, Mail, Building, 
  Shield, BarChart3, History, KeyRound, ClipboardList
} from "lucide-react";
import { MailSettingsForm } from "@/components/mail/MailSettingsForm";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function SettingsCard({ icon, title, description, onClick }: SettingsCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 active:scale-[0.98] group"
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

export default function Parametres() {
  const { permissions, isMagasinier } = useRoleAccess();
  const navigate = useNavigate();
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showMailSettings, setShowMailSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Paramètres | StockAuto";
  }, []);

  if (isMagasinier()) {
    return (
      <DashboardLayout>
        <main className="p-4 md:p-6 space-y-4">
          <header>
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">Mon profil</p>
          </header>
          <ChangePasswordForm />
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-6 max-w-3xl">
        <header>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Configuration de l'application</p>
        </header>

        {/* Mon compte */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Mon compte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingsCard
              icon={<KeyRound className="h-5 w-5" />}
              title="Mot de passe"
              description="Modifier mon mot de passe"
              onClick={() => setShowPassword(true)}
            />
          </div>
        </section>

        {/* Données */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Données</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {permissions.manageUsers && (
              <SettingsCard
                icon={<Users className="h-5 w-5" />}
                title="Utilisateurs"
                description="Gérer les comptes et rôles"
                onClick={() => navigate('/users')}
              />
            )}
            {permissions.manageSuppliers && (
              <SettingsCard
                icon={<Building2 className="h-5 w-5" />}
                title="Fournisseurs"
                description="Gérer les fournisseurs"
                onClick={() => navigate('/fournisseurs')}
              />
            )}
            {permissions.manageCategories && (
              <SettingsCard
                icon={<Tags className="h-5 w-5" />}
                title="Catégories"
                description="Catégories d'articles"
                onClick={() => navigate('/categories')}
              />
            )}
            {permissions.manageVehicles && (
              <SettingsCard
                icon={<Truck className="h-5 w-5" />}
                title="Véhicules"
                description="Parc de véhicules"
                onClick={() => navigate('/vehicules')}
              />
            )}
            <SettingsCard
              icon={<MapPin className="h-5 w-5" />}
              title="Emplacements"
              description="Zones de stockage"
              onClick={() => navigate('/emplacements')}
            />
          </div>
        </section>

        {/* Configuration */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingsCard
              icon={<Building className="h-5 w-5" />}
              title="Entreprise"
              description="Infos pour les bons de commande"
              onClick={() => setShowCompanySettings(true)}
            />
            <SettingsCard
              icon={<Mail className="h-5 w-5" />}
              title="Messagerie"
              description="Configuration email SMTP"
              onClick={() => setShowMailSettings(true)}
            />
          </div>
        </section>

        {/* Administration */}
        {permissions.manageUsers && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Administration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SettingsCard
                icon={<Shield className="h-5 w-5" />}
                title="Rôles & Permissions"
                description="Matrice des droits"
                onClick={() => navigate('/roles-permissions')}
              />
              <SettingsCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Rapports"
                description="Rapports et statistiques"
                onClick={() => navigate('/rapports')}
              />
              <SettingsCard
                icon={<ClipboardList className="h-5 w-5" />}
                title="Journal d'audit"
                description="Traçabilité des actions"
                onClick={() => navigate('/journal-audit')}
              />
              <SettingsCard
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
    </DashboardLayout>
  );
}
