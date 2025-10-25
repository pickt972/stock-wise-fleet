import { Package, FileText, BarChart3, Settings, PlusCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { KPICard } from "@/components/ui/kpi-card";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

export default function Dashboard() {
  const { stats, isLoading } = useRealTimeStats();
  const navigate = useNavigate();

  // Format the last update time
  const lastUpdate = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Stock-Wise Fleet
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion efficace de votre inventaire
          </p>
        </div>

        {/* KPI Cards - Maximum 3 cartes - CLIQUABLES */}
        <div className="grid grid-cols-3 gap-4">
          <div onClick={() => navigate('/articles')} className="cursor-pointer">
            <KPICard
              icon={<Package className="h-6 w-6" />}
              value={isLoading ? "..." : stats.totalArticles}
              label="Articles"
              className="hover:bg-muted/60 transition-colors"
            />
          </div>
          <div onClick={() => navigate('/alertes')} className="cursor-pointer">
            <KPICard
              icon={<AlertTriangle className="h-6 w-6" />}
              value={isLoading ? "..." : stats.activeAlerts}
              label="Alertes"
              className="hover:bg-destructive/10 transition-colors"
            />
          </div>
          <div onClick={() => navigate('/historique')} className="cursor-pointer">
            <KPICard
              icon={<RotateCcw className="h-6 w-6" />}
              value={lastUpdate}
              label="Mise à jour"
              className="hover:bg-muted/60 transition-colors"
            />
          </div>
        </div>

        {/* Main Actions - Boutons XXL empilés verticalement */}
        <div className="space-y-3">
          <ActionButton
            variant="primary"
            size="xxl"
            className="w-full"
            icon={<Package className="h-6 w-6" />}
            onClick={() => navigate('/operations')}
          >
            📷 Opérations Scanner
          </ActionButton>

          <ActionButton
            variant="secondary"
            size="xxl"
            className="w-full"
            icon={<FileText className="h-6 w-6" />}
            onClick={() => navigate('/articles')}
          >
            Consulter stocks
          </ActionButton>

          <ActionButton
            variant="success"
            size="xxl"
            className="w-full"
            icon={<PlusCircle className="h-6 w-6" />}
            onClick={() => navigate('/entrees')}
          >
            Ajouter du stock
          </ActionButton>

          <ActionButton
            variant="primary"
            size="xxl"
            className="w-full"
            icon={<BarChart3 className="h-6 w-6" />}
            onClick={() => navigate('/historique')}
          >
            Historique/Rapports
          </ActionButton>

          <ActionButton
            variant="secondary"
            size="xxl"
            className="w-full"
            icon={<Settings className="h-6 w-6" />}
            onClick={() => navigate('/parametres')}
          >
            Paramètres
          </ActionButton>
        </div>
      </div>
    </DashboardLayout>
  );
}