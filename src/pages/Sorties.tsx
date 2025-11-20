import { useState, useEffect } from "react";
import { PackageMinus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExitList } from "@/components/stock/ExitList";
import { ExitStats } from "@/components/stock/ExitStats";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import DashboardLayout from "./DashboardLayout";

export default function Sorties() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [exits, setExits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [exitTypeFilter, setExitTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchValue, setSearchValue] = useState("");

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
          profiles!stock_exits_created_by_fkey(first_name, last_name),
          stock_exit_items(
            *,
            articles(reference, designation)
          )
        `)
        .order("exit_date", { ascending: false });

      // Filtres
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

      // Recherche
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
        description: "Impossible de charger les sorties",
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

    const todayCount = activeExits.filter(
      (e) => new Date(e.exit_date) >= today
    ).length;

    const monthCount = activeExits.filter(
      (e) => new Date(e.exit_date) >= firstDayOfMonth
    ).length;

    const rentalCount = activeExits.filter(
      (e) => e.exit_type === "location_accessoire" && e.return_status === "en_cours"
    ).length;

    return { todayCount, monthCount, rentalCount };
  };

  const handleQuickExit = async () => {
    if (!selectedArticleId || !quantity || parseInt(quantity) <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un article et une quantité valide",
        variant: "destructive",
      });
      return;
    }

    try {
      // Créer une sortie rapide de type "consommation"
      const { data: exit, error: exitError } = await supabase
        .from("stock_exits")
        .insert([{
          exit_number: "",
          exit_type: "consommation",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (exitError) throw exitError;

      // Créer l'item
      const { error: itemError } = await supabase
        .from("stock_exit_items")
        .insert([{
          exit_id: exit.id,
          article_id: selectedArticleId,
          quantity: parseInt(quantity),
        }]);

      if (itemError) throw itemError;

      toast({
        title: "✅ Sortie enregistrée",
        description: `Article sorti du stock`,
      });

      setSelectedArticleId("");
      setQuantity("");
      setSearchValue("");
      fetchExits();
    } catch (error: any) {
      console.error("Erreur sortie:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchValue(value);
    
    // Rechercher l'article par code-barres ou référence
    if (value.length > 2) {
      const { data, error } = await supabase
        .from("articles")
        .select("id")
        .or(`code_barre.eq.${value},reference.ilike.%${value}%`)
        .single();
      
      if (data && !error) {
        setSelectedArticleId(data.id);
      }
    }
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader title="Sorties de stock" />
        <div className="flex items-center justify-center py-12">
          <p>Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Sorties de stock" />

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">Toutes les sorties</TabsTrigger>
            <TabsTrigger value="quick">Sortie rapide</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <ExitStats {...stats} />

            {/* Filtres et recherche */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  placeholder="Rechercher par N° ou véhicule..."
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
            </div>

            <ExitList exits={exits} onRefresh={fetchExits} />
          </TabsContent>

          <TabsContent value="quick" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">Sortie rapide (Consommation)</h3>
                <p className="text-sm text-muted-foreground">
                  Enregistrez rapidement une sortie de stock pour consommation courante
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Article à sortir</label>
                    <SearchWithScanner
                      placeholder="Scanner ou chercher un article..."
                      value={searchValue}
                      onChange={handleSearchChange}
                      onScan={handleSearchChange}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quantité</label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Quantité à sortir"
                      className="mt-2"
                    />
                  </div>

                  <Button onClick={handleQuickExit} className="w-full">
                    <PackageMinus className="mr-2 h-4 w-4" />
                    Enregistrer la sortie
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
