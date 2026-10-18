import { useState, useEffect } from "react";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeletons/PageSkeleton";
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
import { EntryList } from "@/components/stock/EntryList";
import { EntryStats } from "@/components/stock/EntryStats";
import { PendingDraftReceptions } from "@/components/stock/PendingDraftReceptions";
import { NewEntryForm } from "@/components/stock/NewEntryForm";
import DashboardLayout from "./DashboardLayout";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
  { value: "all", label: "Tout" },
];

export default function Entrees() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [stats, setStats] = useState({ todayCount: 0, monthCount: 0, totalValue: 0 });
  const [entries, setEntries] = useState<any[]>([]);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");

  useEffect(() => {
    fetchEntries();
  }, [searchTerm, entryTypeFilter, dateRange]);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("stock_entries")
        .select(`
          *,
          fournisseurs(nom),
          profiles!stock_entries_created_by_profiles_fkey(first_name, last_name, username),
          stock_entry_items(
            *,
            articles(reference, designation)
          )
        `)
        .order("entry_date", { ascending: false });

      // Filtres
      if (entryTypeFilter !== "all") {
        query = query.eq("entry_type", entryTypeFilter);
      }

      if (dateRange === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("entry_date", today.toISOString());
      } else if (dateRange === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("entry_date", weekAgo.toISOString());
      } else if (dateRange === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("entry_date", monthAgo.toISOString());
      }

      const [{ data, error }, statsResult] = await Promise.all([
        query, supabase.rpc("get_stock_entry_stats"),
      ]);
      if (statsResult.error) throw statsResult.error;
      const values = statsResult.data as { todayCount: number; monthCount: number; totalValue: number } | null;
      if (values) setStats(values);

      if (error) throw error;

      let filteredData = data || [];

      // Recherche
      if (searchTerm) {
        filteredData = filteredData.filter(
          (entry) =>
            entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.fournisseurs?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setEntries(filteredData);
    } catch (error: any) {
      console.error("Erreur chargement entrées:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  if (isLoading && !hasLoaded) {
    return (
      <DashboardLayout>
        <PageHeader title="Entrées de stock" />
        <div className="flex items-center justify-center py-12">
          <PageSkeleton rows={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Entrées de stock" />

        <EntryStats {...stats} />

        <PendingDraftReceptions onReceived={fetchEntries} />

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Input
                placeholder="Rechercher par N° ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64"
              />
              <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="achat">Achat</SelectItem>
                  <SelectItem value="reception">Réception commande</SelectItem>
                  <SelectItem value="retour">Retour</SelectItem>
                  <SelectItem value="transfert">Transfert</SelectItem>
                  <SelectItem value="ajustement">Ajustement</SelectItem>
                  <SelectItem value="reparation">Réparation</SelectItem>
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
              {entries.length} entrée(s)
            </div>
          </div>
          <Button onClick={() => setShowNewEntryForm(true)}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Nouvelle entrée
          </Button>
        </div>

        <EntryList entries={entries} onRefresh={fetchEntries} />

        <NewEntryForm
          open={showNewEntryForm}
          onOpenChange={setShowNewEntryForm}
          onSuccess={fetchEntries}
        />
      </div>
    </DashboardLayout>
  );
}
