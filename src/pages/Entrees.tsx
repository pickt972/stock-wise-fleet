import { useState, useEffect } from "react";
import { PackagePlus } from "lucide-react";
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
import { EntryList } from "@/components/stock/EntryList";
import { EntryStats } from "@/components/stock/EntryStats";
import { NewEntryForm } from "@/components/stock/NewEntryForm";
import DashboardLayout from "./DashboardLayout";

export default function Entrees() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

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
          profiles!stock_entries_created_by_fkey(first_name, last_name),
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

      const { data, error } = await query;

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
        description: "Impossible de charger les entrées",
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

    const activeEntries = entries.filter((e) => e.status === "active");

    const todayCount = activeEntries.filter(
      (e) => new Date(e.entry_date) >= today
    ).length;

    const monthCount = activeEntries.filter(
      (e) => new Date(e.entry_date) >= firstDayOfMonth
    ).length;

    const totalValue = activeEntries.reduce(
      (sum, e) => sum + (e.total_amount || 0),
      0
    );

    return { todayCount, monthCount, totalValue };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader title="Entrées de stock" />
        <div className="flex items-center justify-center py-12">
          <p>Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Entrées de stock" />

        <EntryStats {...stats} />

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Rechercher par N° ou fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="achat">Achat</SelectItem>
                <SelectItem value="retour">Retour</SelectItem>
                <SelectItem value="transfert">Transfert</SelectItem>
                <SelectItem value="ajustement">Ajustement</SelectItem>
                <SelectItem value="reparation">Réparation</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
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
