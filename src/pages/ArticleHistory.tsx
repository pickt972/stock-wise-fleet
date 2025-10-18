import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Download, Filter, History, Clock, User, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
        .select("*")
        .eq("table_name", "articles");

      let movementsQuery = supabase
        .from("audit_logs")
        .select("*")
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
      let combinedLogs: any[] = [
        ...(articlesResult.data || []),
        ...(movementsResult.data || [])
      ];

      // Enrichir les mouvements de stock avec désignation et catégorie
      try {
        const movementArticleIds = Array.from(new Set(
          combinedLogs
            .filter((l: any) => l.table_name === "stock_movements")
            .map((l: any) => {
              const nv = (l.new_values as any) || {};
              const ov = (l.old_values as any) || {};
              return nv.article_id || ov.article_id;
            })
            .filter(Boolean)
        ));

        if (movementArticleIds.length > 0) {
          const { data: articlesInfo } = await supabase
            .from("articles")
            .select("id, designation, categorie")
            .in("id", movementArticleIds as string[]);

          const articlesMap = new Map((articlesInfo || []).map((a: any) => [a.id, a]));
          combinedLogs = combinedLogs.map((log: any) => {
            if (log.table_name === "stock_movements") {
              const values = (log.new_values as any) || (log.old_values as any) || {};
              const art = articlesMap.get(values.article_id);
              if (art) {
                return { ...log, _articleDesignation: art.designation, _articleCategorie: art.categorie };
              }
            }
            return log;
          });
        }
      } catch (_) {
        // Ignorer les erreurs d'enrichissement
      }
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
    
    // Pour les mouvements de stock, afficher la désignation, catégorie, quantité et motif
    if (log.table_name === "stock_movements") {
      const quantity = values?.quantity || "";
      const motif = values?.motif || "";
      const designation = (log as any)._articleDesignation;
      const categorie = (log as any)._articleCategorie;
      
      if (designation && categorie) {
        return `${designation} - ${categorie} ${quantity ? `(${quantity} unités)` : ""}${motif ? ` - ${motif}` : ""}`;
      }
      return `${quantity ? `${quantity} unités` : ""} ${motif ? `- ${motif}` : ""}`;
    }
    
    // Pour les articles, afficher référence et désignation
    if (values?.reference && values?.designation) {
      return `${values.reference} - ${values.designation}`;
    }
    return log.record_id?.substring(0, 8) || "N/A";
  };

  const getUserDisplay = (log: any) => {
    const profile = users?.find?.((u: any) => u.id === log.user_id);
    if (profile) {
      return profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.username || "Utilisateur";
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

  const isMobile = useIsMobile();

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Historique</h1>
          </div>
          <Button onClick={handleExport} variant="outline" size={isMobile ? "sm" : "default"}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Filtres - Desktop */}
        {!isMobile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
        )}

        {/* Filtres - Mobile (Sheet) */}
        {isMobile && (
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher..."
              value={articleFilter}
              onChange={(e) => setArticleFilter(e.target.value)}
              className="flex-1"
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type d'action</label>
                    <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as ActionFilter)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="INSERT">Créations</SelectItem>
                        <SelectItem value="UPDATE">Modifications</SelectItem>
                        <SelectItem value="DELETE">Suppressions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Utilisateur</label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toute la période</SelectItem>
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="week">7 derniers jours</SelectItem>
                        <SelectItem value="month">30 derniers jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={resetFilters} variant="outline" className="w-full">
                    Réinitialiser tous les filtres
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Résultats */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground px-1">
            {auditLogs?.length || 0} opération{(auditLogs?.length || 0) > 1 ? "s" : ""}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              Chargement...
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <Card key={log.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionBadge(log)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{getArticleInfo(log)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{getUserDisplay(log)}</span>
                      </div>
                      
                      {log.table_name === "stock_movements" && (
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          <span>Mouvement de stock</span>
                        </div>
                      )}
                      
                      {log.table_name === "articles" && log.action === "UPDATE" && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-3 w-3 mt-0.5" />
                          <span className="line-clamp-2">
                            Champs modifiés: {Object.keys((log.new_values as any) || {}).join(", ")}
                          </span>
                        </div>
                      )}
                      
                      {log.table_name === "articles" && log.action === "INSERT" && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>Article créé</span>
                        </div>
                      )}
                      
                      {log.table_name === "articles" && log.action === "DELETE" && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>Article supprimé</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun historique trouvé</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
