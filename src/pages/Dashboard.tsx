import { Suspense, lazy } from "react";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealTimeStats } from "@/hooks/useRealTimeStats";
import DashboardLayout from "./DashboardLayout";

// Lazy load des composants lourds
const AlertsList = lazy(() => import("@/components/dashboard/AlertsList").then(m => ({ default: m.AlertsList })));
const RecentMovements = lazy(() => import("@/components/dashboard/RecentMovements").then(m => ({ default: m.RecentMovements })));
const StockForecast = lazy(() => import("@/components/dashboard/StockForecast").then(m => ({ default: m.StockForecast })));
const AdvancedKPIs = lazy(() => import("@/components/dashboard/AdvancedKPIs").then(m => ({ default: m.AdvancedKPIs })));
const StockDistribution = lazy(() => import("@/components/dashboard/StockDistribution").then(m => ({ default: m.StockDistribution })));

const ComponentSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export default function Dashboard() {
  const { stats, isLoading } = useRealTimeStats();

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
          <Suspense fallback={<ComponentSkeleton />}>
            <StockForecast />
          </Suspense>
          
          <Suspense fallback={<ComponentSkeleton />}>
            <AlertsList />
          </Suspense>
        </div>

        {/* Distribution & KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
          <Suspense fallback={<ComponentSkeleton />}>
            <StockDistribution />
          </Suspense>
          
          <Suspense fallback={<ComponentSkeleton />}>
            <AdvancedKPIs />
          </Suspense>
        </div>

        {/* Mouvements récents */}
        <div className="w-full">
          <Suspense fallback={<ComponentSkeleton />}>
            <RecentMovements />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
}