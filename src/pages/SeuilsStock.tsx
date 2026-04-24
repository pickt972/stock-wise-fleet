import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Threshold {
  id: string;
  sous_categorie: string;
  vehicule_id: string | null;
  stock_min: number;
}

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export default function SeuilsStock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulaire ajout
  const [newSubcat, setNewSubcat] = useState<string>("");
  const [newVehicule, setNewVehicule] = useState<string>("__all__");
  const [newMin, setNewMin] = useState<number>(0);

  useEffect(() => {
    document.title = "Seuils de stock | StockAuto";
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [thRes, artRes, vehRes] = await Promise.all([
      supabase
        .from("subcategory_stock_thresholds")
        .select("id, sous_categorie, vehicule_id, stock_min"),
      supabase.from("articles").select("sous_categorie").not("sous_categorie", "is", null),
      supabase.from("vehicules").select("id, marque, modele, immatriculation").eq("actif", true),
    ]);
    if (thRes.error) {
      toast({ title: "Erreur", description: thRes.error.message, variant: "destructive" });
    } else {
      setThresholds((thRes.data || []) as any);
    }
    const subs = Array.from(
      new Set(
        (artRes.data || [])
          .map((a: any) => a.sous_categorie)
          .filter((s: any) => s && s.trim() !== "")
      )
    ).sort();
    setSubcategories(subs);
    setVehicules((vehRes.data || []) as any);
    setIsLoading(false);
  };

  const addThreshold = async () => {
    if (!newSubcat) {
      toast({ title: "Sous-catégorie requise", variant: "destructive" });
      return;
    }
    const payload = {
      sous_categorie: newSubcat,
      vehicule_id: newVehicule === "__all__" ? null : newVehicule,
      stock_min: newMin,
    };
    const { error } = await supabase
      .from("subcategory_stock_thresholds")
      .upsert(payload, { onConflict: "sous_categorie,vehicule_id" });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Seuil enregistré" });
    setNewSubcat("");
    setNewVehicule("__all__");
    setNewMin(0);
    loadAll();
  };

  const updateThreshold = async (id: string, stock_min: number) => {
    const { error } = await supabase
      .from("subcategory_stock_thresholds")
      .update({ stock_min })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Seuil mis à jour" });
  };

  const deleteThreshold = async (id: string) => {
    const { error } = await supabase
      .from("subcategory_stock_thresholds")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Seuil supprimé" });
    setThresholds((prev) => prev.filter((t) => t.id !== id));
  };

  const vehiculeLabel = (id: string | null) => {
    if (!id) return "Tous véhicules (global)";
    const v = vehicules.find((x) => x.id === id);
    return v ? `${v.marque} ${v.modele} (${v.immatriculation})` : "Véhicule inconnu";
  };

  return (
    <DashboardLayout>
      <main className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
        <div>
          <button
            onClick={() => navigate("/parametres")}
            className="flex items-center gap-0.5 -ml-1 text-primary text-[15px] font-medium active:opacity-60 transition-opacity mb-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </button>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            Seuils de stock agrégés
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Définissez le stock minimum par sous-catégorie (toutes marques confondues)
            et par véhicule compatible.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter / mettre à jour un seuil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Sous-catégorie</Label>
                <Select value={newSubcat} onValueChange={setNewSubcat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Véhicule</Label>
                <Select value={newVehicule} onValueChange={setNewVehicule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous (global)</SelectItem>
                    {vehicules.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.marque} {v.modele} ({v.immatriculation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stock minimum</Label>
                <Input
                  type="number"
                  min={0}
                  value={newMin}
                  onChange={(e) => setNewMin(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <Button onClick={addThreshold} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seuils configurés ({thresholds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : thresholds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun seuil personnalisé. Le système utilisera la somme des stock_min des
                articles du groupe par défaut.
              </p>
            ) : (
              <div className="space-y-2">
                {thresholds.map((t) => (
                  <ThresholdRow
                    key={t.id}
                    threshold={t}
                    vehiculeLabel={vehiculeLabel(t.vehicule_id)}
                    onUpdate={updateThreshold}
                    onDelete={deleteThreshold}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}

function ThresholdRow({
  threshold,
  vehiculeLabel,
  onUpdate,
  onDelete,
}: {
  threshold: Threshold;
  vehiculeLabel: string;
  onUpdate: (id: string, stockMin: number) => void;
  onDelete: (id: string) => void;
}) {
  const [value, setValue] = useState<number>(threshold.stock_min);
  const dirty = value !== threshold.stock_min;
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{threshold.sous_categorie}</p>
        <p className="text-xs text-muted-foreground truncate">
          <Badge variant="outline" className="text-xs mr-1">
            {vehiculeLabel}
          </Badge>
        </p>
      </div>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value) || 0)}
        className="w-20"
      />
      <Button
        size="sm"
        variant={dirty ? "default" : "outline"}
        onClick={() => onUpdate(threshold.id, value)}
        disabled={!dirty}
      >
        <Save className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(threshold.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
