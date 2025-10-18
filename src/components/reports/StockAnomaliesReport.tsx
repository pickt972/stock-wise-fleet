import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, XCircle, Clock, BarChart3 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Anomaly {
  id: string;
  type: 'large_variance' | 'negative_stock' | 'low_stock' | 'never_inventoried' | 'frequent_variance';
  severity: 'critical' | 'warning' | 'info';
  article: {
    id: string;
    reference: string;
    designation: string;
    stock: number;
    stock_min: number;
  };
  details: string;
  value?: number;
}

export function StockAnomaliesReport() {
  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ['stock-anomalies'],
    queryFn: async () => {
      const detectedAnomalies: Anomaly[] = [];

      // 1. Récupérer les articles
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('*');

      if (articlesError) throw articlesError;

      // 2. Récupérer les derniers inventaires avec leurs items
      const { data: recentInventories, error: invError } = await supabase
        .from('inventaires')
        .select(`
          id,
          location,
          closed_at,
          status
        `)
        .eq('status', 'CLOSED')
        .order('closed_at', { ascending: false })
        .limit(5);

      if (invError) throw invError;

      const inventoryIds = recentInventories?.map(inv => inv.id) || [];

      const { data: inventoryItems, error: itemsError } = await supabase
        .from('inventaire_items')
        .select('*')
        .in('inventaire_id', inventoryIds);

      if (itemsError) throw itemsError;

      // Analyser chaque article
      articles?.forEach(article => {
        // Anomalie 1: Stock négatif
        if (article.stock < 0) {
          detectedAnomalies.push({
            id: `neg-${article.id}`,
            type: 'negative_stock',
            severity: 'critical',
            article: {
              id: article.id,
              reference: article.reference,
              designation: article.designation,
              stock: article.stock,
              stock_min: article.stock_min,
            },
            details: `Stock négatif détecté: ${article.stock}`,
            value: article.stock,
          });
        }

        // Anomalie 2: Stock sous le minimum
        if (article.stock > 0 && article.stock <= article.stock_min) {
          detectedAnomalies.push({
            id: `low-${article.id}`,
            type: 'low_stock',
            severity: 'warning',
            article: {
              id: article.id,
              reference: article.reference,
              designation: article.designation,
              stock: article.stock,
              stock_min: article.stock_min,
            },
            details: `Stock faible: ${article.stock} (min: ${article.stock_min})`,
            value: article.stock,
          });
        }

        // Anomalie 3: Articles jamais inventoriés
        const articleInventoryItems = inventoryItems?.filter(item => item.article_id === article.id) || [];
        if (articleInventoryItems.length === 0) {
          detectedAnomalies.push({
            id: `never-${article.id}`,
            type: 'never_inventoried',
            severity: 'info',
            article: {
              id: article.id,
              reference: article.reference,
              designation: article.designation,
              stock: article.stock,
              stock_min: article.stock_min,
            },
            details: 'Jamais inventorié dans les derniers inventaires',
          });
        }

        // Anomalie 4: Écarts importants lors du dernier inventaire
        if (articleInventoryItems.length > 0) {
          const lastItem = articleInventoryItems[0];
          if (lastItem.ecart !== null && Math.abs(lastItem.ecart) >= 5) {
            detectedAnomalies.push({
              id: `var-${article.id}`,
              type: 'large_variance',
              severity: Math.abs(lastItem.ecart) >= 10 ? 'critical' : 'warning',
              article: {
                id: article.id,
                reference: article.reference,
                designation: article.designation,
                stock: article.stock,
                stock_min: article.stock_min,
              },
              details: `Écart important lors du dernier inventaire: ${lastItem.ecart > 0 ? '+' : ''}${lastItem.ecart}`,
              value: lastItem.ecart,
            });
          }

          // Anomalie 5: Écarts fréquents
          const itemsWithVariance = articleInventoryItems.filter(item => item.ecart !== null && Math.abs(item.ecart) >= 3);
          if (itemsWithVariance.length >= 3) {
            detectedAnomalies.push({
              id: `freq-${article.id}`,
              type: 'frequent_variance',
              severity: 'warning',
              article: {
                id: article.id,
                reference: article.reference,
                designation: article.designation,
                stock: article.stock,
                stock_min: article.stock_min,
              },
              details: `Écarts fréquents détectés (${itemsWithVariance.length} fois)`,
              value: itemsWithVariance.length,
            });
          }
        }
      });

      // Trier par sévérité
      return detectedAnomalies.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    }
  });

  const getAnomalyIcon = (type: Anomaly['type']) => {
    switch (type) {
      case 'large_variance':
        return <BarChart3 className="h-4 w-4" />;
      case 'negative_stock':
        return <XCircle className="h-4 w-4" />;
      case 'low_stock':
        return <TrendingDown className="h-4 w-4" />;
      case 'never_inventoried':
        return <Clock className="h-4 w-4" />;
      case 'frequent_variance':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAnomalyLabel = (type: Anomaly['type']) => {
    switch (type) {
      case 'large_variance':
        return 'Écart important';
      case 'negative_stock':
        return 'Stock négatif';
      case 'low_stock':
        return 'Stock faible';
      case 'never_inventoried':
        return 'Non inventorié';
      case 'frequent_variance':
        return 'Écarts fréquents';
    }
  };

  const getSeverityColor = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
    }
  };

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;
  const infoCount = anomalies.filter(a => a.severity === 'info').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Détection d'Anomalies de Stock
        </CardTitle>
        <CardDescription>
          Analyse automatique des problèmes de stock basée sur les inventaires
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        {/* Statistiques des anomalies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-destructive">{criticalCount}</div>
            <div className="text-xs md:text-sm text-destructive">Critique</div>
          </div>
          <div className="text-center p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-warning">{warningCount}</div>
            <div className="text-xs md:text-sm text-warning">Attention</div>
          </div>
          <div className="text-center p-3 bg-muted border rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-muted-foreground">{infoCount}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Information</div>
          </div>
        </div>

        {/* Message si aucune anomalie */}
        {anomalies.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aucune anomalie détectée. Votre stock semble conforme !
            </AlertDescription>
          </Alert>
        )}

        {/* Liste des anomalies */}
        {anomalies.length > 0 && (
          <>
            {/* Version desktop avec tableau */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Stock actuel</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((anomaly) => (
                    <TableRow key={anomaly.id}>
                      <TableCell>
                        <Badge variant={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity === 'critical' ? 'Critique' : 
                           anomaly.severity === 'warning' ? 'Attention' : 'Info'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAnomalyIcon(anomaly.type)}
                          <span className="text-sm">{getAnomalyLabel(anomaly.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {anomaly.article.designation}
                      </TableCell>
                      <TableCell>{anomaly.article.reference}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={anomaly.article.stock < 0 ? 'destructive' : 'outline'}>
                          {anomaly.article.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {anomaly.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Version mobile avec cartes */}
            <div className="md:hidden space-y-3">
              {anomalies.map((anomaly) => (
                <Card key={anomaly.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={getSeverityColor(anomaly.severity)} className="mb-2">
                        {anomaly.severity === 'critical' ? 'Critique' : 
                         anomaly.severity === 'warning' ? 'Attention' : 'Info'}
                      </Badge>
                      <Badge variant={anomaly.article.stock < 0 ? 'destructive' : 'outline'}>
                        Stock: {anomaly.article.stock}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {getAnomalyIcon(anomaly.type)}
                      <span className="text-sm font-medium">{getAnomalyLabel(anomaly.type)}</span>
                    </div>
                    <div className="text-sm mb-1">
                      <span className="font-medium">{anomaly.article.reference}</span> - {anomaly.article.designation}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {anomaly.details}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
