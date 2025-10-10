import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Filter, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type FilterType = "all" | "INSERT" | "UPDATE" | "DELETE" | "UPDATE_STATUS";
type TableFilter = "all" | "articles" | "commandes" | "stock_movements" | "inventaires";

export default function JournalAudit() {
  const [actionFilter, setActionFilter] = useState<FilterType>("all");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
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

      if (actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter !== "all") {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  const filteredLogs = auditLogs.filter(log => {
    if (!searchTerm) return true;
    return (
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Utilisateur,Action,Table,Détails\n";
    
    filteredLogs.forEach(log => {
      const date = new Date(log.created_at).toLocaleString('fr-FR');
      csvContent += `${date},${log.user_id || 'Système'},${log.action},${log.table_name},"${JSON.stringify(log.new_values || {})}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journal_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Journal d'audit exporté");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'UPDATE_STATUS': return 'outline';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Création';
      case 'UPDATE': return 'Modification';
      case 'UPDATE_STATUS': return 'Changement statut';
      case 'DELETE': return 'Suppression';
      default: return action;
    }
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      'articles': 'Articles',
      'commandes': 'Commandes',
      'stock_movements': 'Mouvements',
      'inventaires': 'Inventaires'
    };
    return labels[table] || table;
  };

  const formatChanges = (log: any) => {
    if (log.action === 'DELETE') {
      return JSON.stringify(log.old_values, null, 2);
    }
    if (log.action === 'INSERT') {
      return JSON.stringify(log.new_values, null, 2);
    }
    if (log.action === 'UPDATE' || log.action === 'UPDATE_STATUS') {
      const changes: any = {};
      const oldVals = log.old_values || {};
      const newVals = log.new_values || {};
      
      Object.keys(newVals).forEach(key => {
        if (JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])) {
          changes[key] = {
            avant: oldVals[key],
            après: newVals[key]
          };
        }
      });
      
      return JSON.stringify(changes, null, 2);
    }
    return '';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal d'Audit</h1>
            <p className="text-muted-foreground">
              Traçabilité complète de toutes les actions
            </p>
          </div>
          
          <Button onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Période</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dernières 24h</SelectItem>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type d'action</label>
                <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as FilterType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="INSERT">Créations</SelectItem>
                    <SelectItem value="UPDATE">Modifications</SelectItem>
                    <SelectItem value="DELETE">Suppressions</SelectItem>
                    <SelectItem value="UPDATE_STATUS">Changements de statut</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Table</label>
                <Select value={tableFilter} onValueChange={(value) => setTableFilter(value as TableFilter)}>
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
                <label className="text-sm font-medium mb-2 block">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <div className="text-sm text-muted-foreground">Événements</div>
          </div>
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredLogs.filter(l => l.action === 'INSERT').length}
            </div>
            <div className="text-sm text-green-600">Créations</div>
          </div>
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {filteredLogs.filter(l => l.action === 'UPDATE' || l.action === 'UPDATE_STATUS').length}
            </div>
            <div className="text-sm text-blue-600">Modifications</div>
          </div>
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter(l => l.action === 'DELETE').length}
            </div>
            <div className="text-sm text-red-600">Suppressions</div>
          </div>
        </div>

        {/* Journal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historique des événements
            </CardTitle>
            <CardDescription>
              {filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''} trouvé{filteredLogs.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun événement trouvé</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Heure</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {new Date(log.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionColor(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{getTableLabel(log.table_name)}</span>
                        </TableCell>
                        <TableCell>
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground hover:text-foreground">
                              Voir les détails
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                              {formatChanges(log)}
                            </pre>
                          </details>
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
