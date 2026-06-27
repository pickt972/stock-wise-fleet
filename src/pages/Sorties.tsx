import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExitList } from "@/components/stock/ExitList";
import { ExitStats } from "@/components/stock/ExitStats";
import { ActiveRentals } from "@/components/stock/ActiveRentals";
import { NewExitForm } from "@/components/stock/NewExitForm";
import DashboardLayout from "./DashboardLayout";
import { PageSkeleton } from "@/components/ui/skeletons/PageSkeleton";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
  { value: "all", label: "Tout" },
];

export default function Sorties() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [exits, setExits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exitTypeFilter, setExitTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [showNewExit, setShowNewExit] = useState(false);

  useEffect(() => {
    fetchExits();
  }, [searchTerm, exitTypeFilter, dateRange]);

  const fetchExits = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("stock_exits")
        .select(`
          *,
          vehicules(immatriculation, marque, modele),
          stock_exit_items(
            *,
            articles(reference, designation)
          )
        `)
        .order("exit_date", { ascending: false });

      if (exitTypeFilter !== "all") {
        query = query.eq("exit_type", exitTypeFilter);
      }

      if (dateRange === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("exit_date", today.toISOString());
      } else if (dateRange === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("exit_date", weekAgo.toISOString());
      } else if (dateRange === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("exit_date", monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      if (searchTerm) {
        filteredData = filteredData.filter(
          (exit) =>
            exit.exit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exit.vehicules?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setExits(filteredData);
    } catch (error: any) {
      console.error("Erreur chargement sorties:", error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les sorties: ${error?.message || "Erreur inconnue"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeExits = exits.filter((e) => e.status === "active");
    const todayCount = activeExits.filter((e) => new Date(e.exit_date) >= today).length;
    const monthCount = activeExits.filter((e) => new Date(e.exit_date) >= firstDayOfMonth).length;

    return { todayCount, monthCount };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader title="Sorties de stock" />
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Sorties de stock">
          <Button onClick={() => setShowNewExit(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle sortie
          </Button>
        </PageHeader>

        <ActiveRentals onReturnComplete={fetchExits} />

        <ExitStats todayCount={stats.todayCount} monthCount={stats.monthCount} />

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Input
                placeholder="Rechercher par N° ou véhicule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64"
              />
              <Select value={exitTypeFilter} onValueChange={setExitTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="utilisation_vehicule">Utilisation véhicule</SelectItem>
                  <SelectItem value="location_accessoire">Location accessoire</SelectItem>
                  <SelectItem value="consommation">Consommation</SelectItem>
                  <SelectItem value="perte_casse">Perte/Casse</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDateRange(p.value)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                    dateRange === p.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {exits.length} sortie(s)
            </div>
          </div>
        </div>

        <ExitList exits={exits} onRefresh={fetchExits} />
      </div>

      <NewExitForm
        open={showNewExit}
        onOpenChange={setShowNewExit}
        onSuccess={fetchExits}
      />
    </DashboardLayout>
  );
}
