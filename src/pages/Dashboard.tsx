import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { StockForecast } from "@/components/dashboard/StockForecast";
import { AdvancedKPIs } from "@/components/dashboard/AdvancedKPIs";
import { StockDistribution } from "@/components/dashboard/StockDistribution";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";
import { useRoleAccess } from "@/hooks/useRoleAccess";

import DashboardLayout from "./DashboardLayout";

export default function Dashboard() {
  const { stats, isLoading } = useRealTimeStats();
  const { isMagasinier } = useRoleAccess();

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full overflow-x-hidden">
        
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Analytics en temps réel et prévisions</p>
        </div>

        {/* Statistics Cards - Real-time */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full">
          <StatCard
            title="Articles en stock"
            value={isLoading ? "..." : stats.totalArticles.toLocaleString()}
            icon={Package}
            description={`${stats.lowStockCount} en stock faible`}
            trend={{ value: stats.trends.articles, label: "vs semaine dernière" }}
            variant="default"
          />
          <StatCard
            title="Valeur du stock"
            value={isLoading ? "..." : `€ ${stats.totalValue.toLocaleString()}`}
            icon={DollarSign}
            description="Total des investissements"
            trend={{ value: stats.trends.value, label: "vs semaine dernière" }}
            variant="success"
          />
          <StatCard
            title="Alertes actives"
            value={isLoading ? "..." : stats.activeAlerts}
            icon={AlertTriangle}
            description={`${stats.criticalStockCount} critiques`}
            trend={{ value: stats.trends.alerts, label: "vs semaine dernière" }}
            variant="warning"
          />
          <StatCard
            title="Taux de rotation"
            value={isLoading ? "..." : stats.rotationRate}
            icon={TrendingUp}
            description="Rotation hebdomadaire"
            trend={{ value: stats.trends.rotation, label: "vs semaine dernière" }}
            variant="success"
          />
        </div>

        {/* Prévisions & Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
          {/* Prévisions - masqué pour les magasiniers */}
          {!isMagasinier() && <StockForecast />}
          
          {/* Alertes */}
          <AlertsList />
        </div>

        {/* Distribution & KPIs - masqué pour les magasiniers */}
        {!isMagasinier() && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
            {/* Distribution */}
            <StockDistribution />
            
            {/* KPIs Avancés */}
            <AdvancedKPIs />
          </div>
        )}

        {/* Mouvements récents */}
        <div className="w-full">
          <RecentMovements />
        </div>
      </div>
    </DashboardLayout>
  );
}