import { Package, TrendingUp, AlertTriangle, Euro } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { RecentMovements } from "@/components/dashboard/RecentMovements";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre stock automobile</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Articles en stock"
          value="1,247"
          icon={Package}
          description="Total des références"
          trend={{ value: 12, label: "vs mois dernier" }}
        />
        <StatCard
          title="Valeur du stock"
          value="€45,230"
          icon={Euro}
          description="Valeur totale actuelle"
          trend={{ value: 8, label: "vs mois dernier" }}
          variant="success"
        />
        <StatCard
          title="Alertes actives"
          value="5"
          icon={AlertTriangle}
          description="Articles en rupture/faible"
          variant="warning"
        />
        <StatCard
          title="Taux de rotation"
          value="89%"
          icon={TrendingUp}
          description="Rotation mensuelle"
          trend={{ value: 5, label: "vs mois dernier" }}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsList />
        <RecentMovements />
      </div>
    </div>
  );
}