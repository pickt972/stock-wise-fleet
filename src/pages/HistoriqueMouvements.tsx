import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchWithScanner } from "@/components/SearchWithScanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { ArticleListSkeleton } from "@/components/ui/skeletons/ArticleListSkeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Download } from "lucide-react";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  motif: string;
  created_at: string;
  article_id: string;
  articles: {
    designation: string;
    reference: string;
  };
}

export default function HistoriqueMouvements() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterArticle, setFilterArticle] = useState<string>("");

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          type,
          quantity,
          motif,
          created_at,
          article_id,
          articles (
            designation,
            reference
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
      setFilteredMovements(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filterType, filterPeriod, filterArticle, movements]);

  const applyFilters = () => {
    let filtered = [...movements];

    // Filtre par type
    if (filterType !== "all") {
      filtered = filtered.filter(m => m.type === filterType);
    }

    // Filtre par période
    if (filterPeriod !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(m => {
        const movementDate = new Date(m.created_at);
        
        switch (filterPeriod) {
          case "today":
            return movementDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return movementDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return movementDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Filtre par article
    if (filterArticle.trim() !== "") {
      const searchLower = filterArticle.toLowerCase();
      filtered = filtered.filter(m => 
        m.articles?.designation?.toLowerCase().includes(searchLower) ||
        m.articles?.reference?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMovements(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entree':
        return '➕';
      case 'sortie':
        return '✏️';
      default:
        return '📦';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'entree':
        return <Badge className="bg-success text-success-foreground">Entrée</Badge>;
      case 'sortie':
        return <Badge className="bg-warning text-warning-foreground">Sortie</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = 'Historique des Mouvements';
    const date = new Date().toLocaleDateString('fr-FR');
    
    // En-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 10, 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Genere le ${date}`, 10, 20);
    doc.text(`Nombre total de mouvements: ${filteredMovements.length}`, 10, 25);
    
    // Ligne de séparation
    doc.line(10, 28, 200, 28);
    
    // Mouvements
    let y = 35;
    filteredMovements.forEach((movement, index) => {
      // Vérifier si on doit créer une nouvelle page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const dateStr = format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr });
      const typeStr = movement.type === 'entree' ? 'ENTREE' : 'SORTIE';
      const articleStr = movement.articles?.designation || 'Article inconnu';
      const qtyStr = `Qte: ${movement.quantity}`;
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${dateStr}`, 10, y);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${typeStr}`, 10, y + 5);
      doc.text(`Article: ${articleStr}`, 10, y + 10);
      doc.text(`${qtyStr} - Motif: ${movement.motif || 'N/A'}`, 10, y + 15);
      
      y += 22;
    });
    
    // Sauvegarde
    doc.save(`historique-mouvements-${date}.pdf`);
    
    toast({
      title: "✅ Export PDF réussi",
      description: `${filteredMovements.length} mouvements exportés`,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <ArticleListSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title="Historique" showBackButton />
        
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Filtres */}
          <Card className="p-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Filtres</h3>
              
              {/* Recherche par article */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Rechercher un article</label>
                <SearchWithScanner
                  placeholder="Filtrer par article..."
                  value={filterArticle}
                  onChange={setFilterArticle}
                  onArticleNotFound={() => {}}
                  returnTo="/historique"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Type d'opération</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="entree">Entrées</SelectItem>
                      <SelectItem value="sortie">Sorties</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Période</label>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center pt-2">
                {filteredMovements.length} mouvement(s) affiché(s)
              </div>
              
              {filteredMovements.length > 0 && (
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  className="w-full mt-3"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </Button>
              )}
            </div>
          </Card>

          {/* Liste des mouvements */}
          {filteredMovements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">Aucun mouvement trouvé</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Commencez par ajouter du stock pour voir l'historique
                </p>
                <Button onClick={() => navigate('/entrees')}>
                  ➕ Ajouter du stock
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMovements.map((movement) => (
              <Card 
                key={movement.id} 
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (movement.article_id) {
                    navigate(`/articles/${movement.article_id}`);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getTypeIcon(movement.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {movement.articles?.designation || 'Article supprimé'}
                        </h3>
                        {getTypeBadge(movement.type)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {movement.motif} • Quantité: {movement.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      
                      {/* Boutons d'action */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (movement.article_id) {
                              navigate(`/articles/${movement.article_id}`);
                            }
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Voir article
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
