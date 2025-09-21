import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, AlertTriangle, CheckCircle, ShoppingCart, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "./DashboardLayout";
import type { Tables } from "@/integrations/supabase/types";

type Vehicule = Tables<"vehicules">;
type Article = Tables<"articles">;

interface VehiculeGroup {
  marque: string;
  modele: string;
  motorisation: string | null;
  count: number;
  vehicules: Vehicule[];
}

interface CompatibleArticle extends Article {
  compatible_vehicules: {
    notes: string | null;
  }[];
}

export default function Revisions() {
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<VehiculeGroup | null>(null);
  const [quantiteRevision, setQuantiteRevision] = useState<number | "">(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: vehicules = [] } = useQuery({
    queryKey: ["vehicules-actifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .eq("actif", true)
        .order("marque", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articlesCompatibles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["articles-compatibles", selectedGroup],
    queryFn: async () => {
      if (!selectedGroup || selectedGroup.vehicules.length === 0) return [];
      
      const vehiculeIds = selectedGroup.vehicules.map(v => v.id);
      
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          article_vehicules!inner (
            notes,
            vehicule_id
          )
        `)
        .in("article_vehicules.vehicule_id", vehiculeIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGroup,
  });

  // Grouper les véhicules par marque/modèle/motorisation
  const vehiculeGroups: VehiculeGroup[] = vehicules.reduce((groups: VehiculeGroup[], vehicule) => {
    const existingGroup = groups.find(
      g => g.marque === vehicule.marque && 
           g.modele === vehicule.modele && 
           g.motorisation === vehicule.motorisation
    );

    if (existingGroup) {
      existingGroup.count++;
      existingGroup.vehicules.push(vehicule);
    } else {
      groups.push({
        marque: vehicule.marque,
        modele: vehicule.modele,
        motorisation: vehicule.motorisation,
        count: 1,
        vehicules: [vehicule]
      });
    }

    return groups;
  }, []);

  const analyseStock = (article: Article, quantiteNecessaire: number) => {
    const stockDisponible = article.stock;
    const stockManquant = Math.max(0, quantiteNecessaire - stockDisponible);
    
    return {
      disponible: stockDisponible,
      necessaire: quantiteNecessaire,
      manquant: stockManquant,
      suffisant: stockDisponible >= quantiteNecessaire
    };
  };

  const handleRevisionAnalysis = (group: VehiculeGroup) => {
    setSelectedGroup(group);
    setIsAnalyzing(true);
  };

  const generateCommande = async () => {
    if (!selectedGroup || !articlesCompatibles.length) return;

    const piecesACommander = articlesCompatibles
      .map(article => {
        const analyse = analyseStock(article, typeof quantiteRevision === "number" ? quantiteRevision : 1);
        return { article, analyse };
      })
      .filter(({ analyse }) => analyse.manquant > 0);

    if (piecesACommander.length === 0) {
      toast.info("Toutes les pièces sont disponibles en stock");
      return;
    }

    // Ici on pourrait créer automatiquement une commande
    toast.success(`Analyse terminée: ${piecesACommander.length} pièces à commander`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Révisions Programmées</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sélection des véhicules */}
          <Card>
            <CardHeader>
              <CardTitle>Véhicules par Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehiculeGroups.map((group, index) => (
                  <button 
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer w-full text-left transition-colors"
                    onClick={() => handleRevisionAnalysis(group)}
                  >
                    <div>
                      <div className="font-medium">
                        {group.marque} {group.modele}
                        {group.motorisation && ` (${group.motorisation})`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {group.count} véhicule{group.count > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {group.count}
                    </Badge>
                  </button>
                ))}
                
                {vehiculeGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun véhicule actif enregistré
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analyse des pièces */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Pièces</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedGroup ? (
                <div className="text-center py-8 text-muted-foreground">
                  Sélectionnez un type de véhicule pour analyser les pièces nécessaires
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/20 rounded-lg">
                    <h3 className="font-medium">
                      {selectedGroup.marque} {selectedGroup.modele}
                      {selectedGroup.motorisation && ` (${selectedGroup.motorisation})`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.count} véhicule{selectedGroup.count > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="quantite">Quantité de véhicules à réviser</Label>
                    <Input
                      id="quantite"
                      type="number"
                      min="1"
                      max={selectedGroup.count}
                      value={quantiteRevision}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setQuantiteRevision("");
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num) && num >= 1) {
                            setQuantiteRevision(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "" || parseInt(e.target.value) < 1) {
                          setQuantiteRevision(1);
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  {loadingArticles ? (
                    <div className="text-center py-4">Chargement des pièces...</div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-medium">
                        Pièces compatibles ({articlesCompatibles.length})
                      </h4>
                      
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {articlesCompatibles.map((article) => {
                          const analyse = analyseStock(article, typeof quantiteRevision === "number" ? quantiteRevision : 1);
                          return (
                            <div key={article.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{article.designation}</div>
                                <div className="text-xs text-muted-foreground">
                                  {article.reference} - {article.marque}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  {analyse.suffisant ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  )}
                                  <div className="text-sm">
                                    <div>{analyse.disponible}/{analyse.necessaire}</div>
                                    {analyse.manquant > 0 && (
                                      <div className="text-xs text-orange-600">
                                        Manque: {analyse.manquant}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {articlesCompatibles.length > 0 && (
                        <div className="pt-4 space-y-2">
                          <Button 
                            onClick={generateCommande}
                            className="w-full"
                            variant="default"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Générer la Commande Nécessaire
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Résumé de l'analyse */}
        {selectedGroup && articlesCompatibles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résumé de l'Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {articlesCompatibles.filter(a => analyseStock(a, typeof quantiteRevision === "number" ? quantiteRevision : 1).suffisant).length}
                  </div>
                  <div className="text-sm text-green-700">Pièces disponibles</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-600">
                    {articlesCompatibles.filter(a => !analyseStock(a, typeof quantiteRevision === "number" ? quantiteRevision : 1).suffisant).length}
                  </div>
                  <div className="text-sm text-orange-700">Pièces à commander</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">
                    {typeof quantiteRevision === "number" ? quantiteRevision : 1}
                  </div>
                  <div className="text-sm text-blue-700">Véhicules à réviser</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}