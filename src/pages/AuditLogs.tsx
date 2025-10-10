import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Download, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type FilterType = "all" | "INSERT" | "UPDATE" | "DELETE" | "UPDATE_STATUS";
type TableFilter = "all" | "articles" | "commandes" | "stock_movements" | "inventaires";

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<FilterType>("all");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [dateRange, setDateRange] = useState("7");

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, tableFilter, dateRange],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Utilisateur,Action,Table,ID Enregistrement\n";
    
    auditLogs.forEach(log => {
      csvContent += `${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })},${log.user_id || 'Système'},${log.action},${log.table_name},${log.record_id || 'N/A'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Logs exportés avec succès");
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
      UPDATE_STATUS: "outline"
    };
    
    const labels: Record<string, string> = {
      INSERT: "Création",
      UPDATE: "Modification",
      DELETE: "Suppression",
      UPDATE_STATUS: "Changement statut"
    };

    return (
      <Badge variant={variants[action] || "outline"}>
        {labels[action] || action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      articles: "Articles",
      commandes: "Commandes",
      stock_movements: "Mouvements",
      inventaires: "Inventaires"
    };
    return labels[tableName] || tableName;
  };

  const stats = {
    total: auditLogs.length,
    inserts: auditLogs.filter(l => l.action === 'INSERT').length,
    updates: auditLogs.filter(l => l.action === 'UPDATE' || l.action === 'UPDATE_STATUS').length,
    deletes: auditLogs.filter(l => l.action === 'DELETE').length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Journal d'Audit
            </h1>
            <p className="text-muted-foreground">
              Traçabilité complète des actions dans l'application
            </p>
          </div>
          
          <Button onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total actions</div>
          </div>
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.inserts}</div>
            <div className="text-sm text-green-600">Créations</div>
          </div>
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
            <div className="text-sm text-blue-600">Modifications</div>
          </div>
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
            <div className="text-sm text-red-600">Suppressions</div>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type d'action</label>
                <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as FilterType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="INSERT">Créations uniquement</SelectItem>
                    <SelectItem value="UPDATE">Modifications uniquement</SelectItem>
                    <SelectItem value="DELETE">Suppressions uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Table</label>
                <Select value={tableFilter} onValueChange={(v) => setTableFilter(v as TableFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les tables</SelectItem>
                    <SelectItem value="articles">Articles</SelectItem>
                    <SelectItem value="commandes">Commandes</SelectItem>
                    <SelectItem value="stock_movements">Mouvements</SelectItem>
                    <SelectItem value="inventaires">Inventaires</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Période</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Aujourd'hui</SelectItem>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table des logs */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des actions ({auditLogs.length})</CardTitle>
            <CardDescription>
              Les 500 dernières actions enregistrées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Chargement...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune action trouvée</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Heure</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>ID Enregistrement</TableHead>
                      <TableHead>Utilisateur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTableLabel(log.table_name)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.user_id ? log.user_id.substring(0, 8) + '...' : 'Système'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
