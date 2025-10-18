import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Filter, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

type ActionFilter = "all" | "INSERT" | "UPDATE" | "DELETE";

export default function ArticleHistory() {
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [articleFilter, setArticleFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Récupérer tous les logs d'audit pour les articles ET les mouvements de stock
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["article-history", actionFilter, userFilter, articleFilter, dateFilter],
    queryFn: async () => {
      // Construire la requête de base pour les articles et mouvements
      let articlesQuery = supabase
        .from("audit_logs")
        .select(`
          *,
          profiles:user_id (username, first_name, last_name)
        `)
        .eq("table_name", "articles");

      let movementsQuery = supabase
        .from("audit_logs")
        .select(`
          *,
          profiles:user_id (username, first_name, last_name)
        `)
        .eq("table_name", "stock_movements");

      // Appliquer les filtres de date
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        articlesQuery = articlesQuery.gte("created_at", startDate.toISOString());
        movementsQuery = movementsQuery.gte("created_at", startDate.toISOString());
      }

      // Appliquer le filtre utilisateur
      if (userFilter !== "all") {
        articlesQuery = articlesQuery.eq("user_id", userFilter);
        movementsQuery = movementsQuery.eq("user_id", userFilter);
      }

      // Récupérer les données
      const [articlesResult, movementsResult] = await Promise.all([
        articlesQuery,
        movementsQuery
      ]);

      if (articlesResult.error) throw articlesResult.error;
      if (movementsResult.error) throw movementsResult.error;

      // Combiner les deux types de logs
      let combinedLogs = [
        ...(articlesResult.data || []),
        ...(movementsResult.data || [])
      ];

      // Filtrer par action si nécessaire
      if (actionFilter !== "all") {
        combinedLogs = combinedLogs.filter(log => log.action === actionFilter);
      }

      // Filtrer par référence ou désignation d'article
      if (articleFilter) {
        combinedLogs = combinedLogs.filter(log => {
          const newValues = log.new_values as any;
          const oldValues = log.old_values as any;
          const searchTerm = articleFilter.toLowerCase();
          
          return (
            newValues?.reference?.toLowerCase().includes(searchTerm) ||
            newValues?.designation?.toLowerCase().includes(searchTerm) ||
            oldValues?.reference?.toLowerCase().includes(searchTerm) ||
            oldValues?.designation?.toLowerCase().includes(searchTerm) ||
            newValues?.article_id?.toLowerCase().includes(searchTerm)
          );
        });
      }

      // Trier par date décroissante
      combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combinedLogs;
    },
  });

  // Récupérer la liste des utilisateurs pour le filtre
  const { data: users } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name")
        .order("username");
      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (log: any) => {
    // Pour les mouvements de stock, afficher le type (entrée/sortie)
    if (log.table_name === "stock_movements") {
      const movementType = (log.new_values as any)?.type || (log.old_values as any)?.type;
      if (movementType === "entree") {
        return <Badge variant="default" className="bg-green-500">Entrée</Badge>;
      } else if (movementType === "sortie") {
        return <Badge variant="default" className="bg-orange-500">Sortie</Badge>;
      }
    }
    
    // Pour les articles, afficher l'action
    switch (log.action) {
      case "INSERT":
        return <Badge variant="default" className="bg-green-500">Création</Badge>;
      case "UPDATE":
        return <Badge variant="default" className="bg-blue-500">Modification</Badge>;
      case "DELETE":
        return <Badge variant="destructive">Suppression</Badge>;
      default:
        return <Badge variant="outline">{log.action}</Badge>;
    }
  };

  const getArticleInfo = (log: any) => {
    const newValues = log.new_values as any;
    const oldValues = log.old_values as any;
    const values = newValues || oldValues;
    
    // Pour les mouvements de stock, afficher la quantité et le motif
    if (log.table_name === "stock_movements") {
      const quantity = values?.quantity || "";
      const motif = values?.motif || "";
      return `${quantity ? `${quantity} unités` : ""} ${motif ? `- ${motif}` : ""}`;
    }
    
    // Pour les articles, afficher référence et désignation
    if (values?.reference && values?.designation) {
      return `${values.reference} - ${values.designation}`;
    }
    return log.record_id?.substring(0, 8) || "N/A";
  };

  const getUserDisplay = (log: any) => {
    const profile = log.profiles;
    if (profile) {
      return profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.username || "Utilisateur inconnu";
    }
    return "Système";
  };

  const handleExport = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Il n'y a pas d'historique à exporter",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ["Date", "Action", "Article", "Utilisateur", "Détails"].join(","),
      ...auditLogs.map(log => [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr }),
        log.action,
        getArticleInfo(log).replace(/,/g, ";"),
        getUserDisplay(log).replace(/,/g, ";"),
        log.action === "UPDATE" ? "Modification" : log.action === "DELETE" ? "Suppression" : "Création",
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historique-articles-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Export réussi",
      description: "L'historique a été exporté avec succès",
    });
  };

  const resetFilters = () => {
    setActionFilter("all");
    setUserFilter("all");
    setArticleFilter("");
    setDateFilter("all");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Historique des Articles</h1>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as ActionFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type d'action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="INSERT">Créations</SelectItem>
                  <SelectItem value="UPDATE">Modifications</SelectItem>
                  <SelectItem value="DELETE">Suppressions</SelectItem>
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute la période</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">7 derniers jours</SelectItem>
                  <SelectItem value="month">30 derniers jours</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Rechercher un article..."
                value={articleFilter}
                onChange={(e) => setArticleFilter(e.target.value)}
              />

              <Button onClick={resetFilters} variant="outline">
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auditLogs?.length || 0} opération{(auditLogs?.length || 0) > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement de l'historique...
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>{getActionBadge(log)}</TableCell>
                        <TableCell className="font-medium">{getArticleInfo(log)}</TableCell>
                        <TableCell>{getUserDisplay(log)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.table_name === "stock_movements" && (
                            <span>Mouvement de stock</span>
                          )}
                          {log.table_name === "articles" && log.action === "UPDATE" && (
                            <span>Champs modifiés: {Object.keys((log.new_values as any) || {}).join(", ")}</span>
                          )}
                          {log.table_name === "articles" && log.action === "INSERT" && <span>Article créé</span>}
                          {log.table_name === "articles" && log.action === "DELETE" && <span>Article supprimé</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun historique trouvé pour ces critères
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
