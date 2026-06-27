import { useState, useEffect } from "react";
import { PackageMinus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Article {
  id: string;
  reference: string;
  designation: string;
  stock: number;
}

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
}

interface NewExitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewExitForm({ open, onOpenChange, onSuccess }: NewExitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [articleId, setArticleId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [exitType, setExitType] = useState("consommation");
  const [vehiculeId, setVehiculeId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchData();
      setArticleId("");
      setQuantity("");
      setExitType("consommation");
      setVehiculeId("");
      setNotes("");
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [articlesRes, vehiculesRes] = await Promise.all([
        supabase.from("articles").select("id, reference, designation, stock").order("designation"),
        supabase.from("vehicules").select("id, immatriculation, marque, modele").order("immatriculation"),
      ]);
      if (articlesRes.error) throw articlesRes.error;
      if (vehiculesRes.error) throw vehiculesRes.error;
      setArticles(articlesRes.data || []);
      setVehicules(vehiculesRes.data || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!articleId) {
      toast({ title: "Erreur", description: "Sélectionnez un article", variant: "destructive" });
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Erreur", description: "Quantité invalide", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data: exit, error: exitError } = await supabase
        .from("stock_exits")
        .insert([{
          exit_number: "",
          exit_type: exitType,
          vehicule_id: vehiculeId || null,
          notes: notes || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (exitError) throw exitError;

      const { error: itemError } = await supabase
        .from("stock_exit_items")
        .insert([{
          exit_id: exit.id,
          article_id: articleId,
          quantity: qty,
        }]);

      if (itemError) throw itemError;

      toast({ title: "✅ Sortie enregistrée", description: `${qty} unité(s) sortie(s) du stock` });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erreur création sortie:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la sortie",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📤 Nouvelle sortie de stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Article *</Label>
            <SearchableSelect
              options={articles.map((a) => ({
                value: a.id,
                label: `${a.reference} - ${a.designation} (stock: ${a.stock})`,
              }))}
              value={articleId}
              onValueChange={setArticleId}
              placeholder="Sélectionner un article..."
              searchPlaceholder="Rechercher par référence ou désignation..."
              emptyMessage="Aucun article trouvé."
            />
          </div>

          <div>
            <Label htmlFor="quantity">Quantité *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="exit-type">Type de sortie *</Label>
            <Select value={exitType} onValueChange={setExitType}>
              <SelectTrigger id="exit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consommation">Consommation</SelectItem>
                <SelectItem value="location_accessoire">Location accessoire</SelectItem>
                <SelectItem value="perte_casse">Perte / Casse</SelectItem>
                <SelectItem value="utilisation_vehicule">Utilisation véhicule</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Véhicule (optionnel)</Label>
            <SearchableSelect
              options={[
                { value: "", label: "— Aucun —" },
                ...vehicules.map((v) => ({
                  value: v.id,
                  label: `${v.immatriculation}${v.marque ? ` - ${v.marque}` : ""}${v.modele ? ` ${v.modele}` : ""}`,
                })),
              ]}
              value={vehiculeId}
              onValueChange={setVehiculeId}
              placeholder="Sélectionner un véhicule..."
              searchPlaceholder="Rechercher un véhicule..."
              emptyMessage="Aucun véhicule trouvé."
            />
          </div>

          <div>
            <Label htmlFor="notes">Note (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <PackageMinus className="mr-2 h-4 w-4" />
            {isLoading ? "Enregistrement..." : "Confirmer la sortie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
