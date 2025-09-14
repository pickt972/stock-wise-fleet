import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import DashboardLayout from "./DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm md:text-base text-muted-foreground">Vue d'ensemble de votre gestion des stocks</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard
            title="Articles en stock"
            value="1,247"
            icon={Package}
            description="+12% ce mois"
            trend={{ value: 12, label: "vs mois dernier" }}
            variant="default"
          />
          <StatCard
            title="Valeur du stock"
            value="€ 45,230"
            icon={DollarSign}
            description="Total des investissements"
            trend={{ value: 8, label: "vs mois dernier" }}
            variant="success"
          />
          <StatCard
            title="Alertes actives"
            value="8"
            icon={AlertTriangle}
            description="Articles à surveiller"
            trend={{ value: -15, label: "vs mois dernier" }}
            variant="warning"
          />
          <StatCard
            title="Taux de rotation"
            value="2.4"
            icon={TrendingUp}
            description="Rotation moyenne"
            trend={{ value: 5, label: "vs mois dernier" }}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Alertes */}
          <div className="lg:col-span-1">
            <AlertsList />
          </div>
          
          {/* Mouvements récents */}
          <div className="lg:col-span-2">
            <RecentMovements />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}