import { ArticlePickerField } from "@/components/shared/CategoryPicker";
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
  vehicule_required?: boolean;
  categorie?: string | null;
  sous_categorie?: string | null;
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
  const [plate, setPlate] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openField, setOpenField] = useState<"marque" | "modele" | null>(null);
  const [notes, setNotes] = useState("");
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null; requires_vehicle: boolean | null }[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
      setArticleId("");
      setQuantity("");
      setExitType("consommation");
      setPlate("");
      setMarque("");
      setModele("");
      setSelectedVehicule(null);
      setNotes("");
    }
  }, [open]);

  const normalizePlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Format SIV AA-000-AA ; sinon (anciens formats / DOM) : majuscules telles quelles
  const formatPlate = (input: string) => {
    const raw = normalizePlate(input);
    const m = raw.match(/^([A-Z]{0,2})(\d{0,3})([A-Z]{0,2})$/);
    const isSiv = m && (raw.length <= 2 ? /^[A-Z]*$/.test(raw) : /^[A-Z]{2}/.test(raw)) && (!m[3] || m[2].length === 3);
    if (!isSiv) return input.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ");
    return [m![1], m![2], m![3]].filter(Boolean).join("-");
  };
  const plateKey = normalizePlate(plate);
  const suggestions = plateKey && !selectedVehicule
    ? vehicules.filter((v) => normalizePlate(v.immatriculation).startsWith(plateKey)).slice(0, 8)
    : [];
  const selectedArt = articles.find((a) => a.id === articleId);
  const categoryRequiresVehicle = (() => {
    if (!selectedArt) return false;
    const byName = (n?: string | null) => n ? cats.find((c) => c.nom.trim().toLowerCase() === n.trim().toLowerCase()) : undefined;
    // Sous-catégorie : surcharge si non null, sinon on remonte les parents
    let node = byName(selectedArt.sous_categorie) ?? byName(selectedArt.categorie);
    let guard = 0;
    while (node && guard++ < 10) {
      if (node.requires_vehicle === true) return true;
      if (node.requires_vehicle === false && node.parent_id) return false;
      node = node.parent_id ? cats.find((c) => c.id === node!.parent_id) : undefined;
    }
    // Catégorie de l'article si la sous-catégorie n'est pas rattachée
    return !!byName(selectedArt.categorie)?.requires_vehicle;
  })();
  const needsVehicle = !!selectedArt?.vehicule_required || categoryRequiresVehicle;
  const vehiculeValid = !needsVehicle || !!plate.trim() && (!!selectedVehicule || (!!marque.trim() && !!modele.trim()));

  const titleCase = (v: string) => v.toLowerCase().replace(/(^|[\s-])(\S)/g, (_m, a, b) => a + b.toUpperCase());
  const uniq = (arr: string[]) => {
    const map = new Map<string, string>();
    arr.forEach((x) => { const t = x?.trim(); if (t && !map.has(t.toLowerCase())) map.set(t.toLowerCase(), t); });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "fr"));
  };
  const marqueSuggestions = uniq(vehicules.map((v) => v.marque || ""))
    .filter((m) => m.toLowerCase().includes(marque.trim().toLowerCase()) && m.toLowerCase() !== marque.trim().toLowerCase())
    .slice(0, 8);
  const modeleSuggestions = uniq(
    vehicules
      .filter((v) => !marque.trim() || (v.marque || "").trim().toLowerCase() === marque.trim().toLowerCase())
      .map((v) => v.modele || "")
  )
    .filter((m) => m.toLowerCase().includes(modele.trim().toLowerCase()) && m.toLowerCase() !== modele.trim().toLowerCase())
    .slice(0, 8);

  const handlePlateChange = (value: string) => {
    setPlate(formatPlate(value));
    setShowSuggestions(true);
    if (selectedVehicule) {
      setSelectedVehicule(null);
      setMarque("");
      setModele("");
    }
  };

  const selectVehicule = (v: Vehicule) => {
    setSelectedVehicule(v);
    setPlate(v.immatriculation);
    setMarque(v.marque || "");
    setModele(v.modele || "");
    setShowSuggestions(false);
  };

  const fetchData = async () => {
    try {
      const [articlesRes, vehiculesRes, catsRes] = await Promise.all([
        supabase.from("articles").select("id, reference, designation, stock, vehicule_required, categorie, sous_categorie").order("designation"),
        supabase.from("vehicules").select("id, immatriculation, marque, modele").order("immatriculation"),
        supabase.from("categories").select("id, nom, parent_id, requires_vehicle"),
      ]);
      setCats((catsRes.data as any) || []);
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

    const selectedArticle = articles.find((a) => a.id === articleId);
    if (selectedArticle && qty > selectedArticle.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Disponible : ${selectedArticle.stock} unité(s)`,
        variant: "destructive",
      });
      return;
    }

    if (!vehiculeValid) {
      toast({ title: "Véhicule obligatoire pour cette catégorie d'article", description: "Sélectionnez un véhicule de la flotte ou saisissez-en un.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let finalVehiculeId = needsVehicle ? selectedVehicule?.id ?? null : null;
      if (needsVehicle && !finalVehiculeId) {
        const existing = vehicules.find((v) => normalizePlate(v.immatriculation) === normalizePlate(plate));
        if (existing) {
          finalVehiculeId = existing.id;
        } else {
          const { data: created, error: vErr } = await supabase
            .from("vehicules")
            .insert([{ immatriculation: plate.trim().toUpperCase(), marque: marque.trim(), modele: modele.trim(), user_id: user?.id }])
            .select("id")
            .single();
          if (vErr) throw vErr;
          finalVehiculeId = created.id;
        }
      }

      // exit_number laissé vide → le trigger Supabase (trigger_set_exit_number)
      // génère automatiquement le numéro séquentiel SOR-YYYY-XXXXXX avant l'INSERT.
      // Le décrément de articles.stock est aussi géré côté Supabase par le trigger
      // trigger_decrease_stock_on_exit après INSERT dans stock_exit_items.
      const { data: exit, error: exitError } = await supabase
        .from("stock_exits")
        .insert([{
          exit_number: "",        // sera remplacé par le trigger BEFORE INSERT
          exit_type: exitType,
          vehicule_id: finalVehiculeId,
          notes: notes || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (exitError) throw exitError;

      // L'INSERT dans stock_exit_items déclenche trigger_decrease_stock_on_exit
      // qui décrémente articles.stock et insère un mouvement dans stock_movements.
      const { error: itemError } = await supabase
        .from("stock_exit_items")
        .insert([{
          exit_id: exit.id,
          article_id: articleId,
          quantity: qty,
        }]);

      if (itemError) throw itemError;

      toast({
        title: "✅ Sortie enregistrée",
        description: `${qty} unité(s) sortie(s) — N° ${exit.exit_number}`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erreur création sortie:", error);
      // Le trigger Supabase lève une exception si stock insuffisant côté DB —
      // on affiche le message exact pour que l'utilisateur comprenne.
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
            <ArticlePickerField value={articleId} onChange={setArticleId} showStock />
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

          {needsVehicle && (<div className="space-y-3">
            <div className="relative">
              <Label htmlFor="plate">Immatriculation *</Label>
              <Input
                id="plate"
                value={plate}
                autoComplete="off"
                onChange={(e) => handlePlateChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="AB-123-CD"
                className="uppercase"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
                  {suggestions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectVehicule(v)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="font-mono font-semibold">{v.immatriculation}</span>
                      <span className="text-muted-foreground"> — {v.marque} {v.modele}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Label htmlFor="marque">Marque{selectedVehicule ? "" : " *"}</Label>
                <Input id="marque" value={marque} readOnly={!!selectedVehicule} autoComplete="off"
                  disabled={!!selectedVehicule}
                  onChange={(e) => { setMarque(e.target.value.toUpperCase()); setOpenField("marque"); }}
                  onFocus={() => setOpenField("marque")}
                  onBlur={() => setTimeout(() => setOpenField(null), 150)} />
                {openField === "marque" && !selectedVehicule && marqueSuggestions.length > 0 && (
                  <SuggestList items={marqueSuggestions} onPick={(v) => { setMarque(v.toUpperCase()); setOpenField(null); }} />
                )}
              </div>
              <div className="relative">
                <Label htmlFor="modele">Modèle{selectedVehicule ? "" : " *"}</Label>
                <Input id="modele" value={modele} readOnly={!!selectedVehicule} autoComplete="off"
                  disabled={!!selectedVehicule}
                  onChange={(e) => { setModele(titleCase(e.target.value)); setOpenField("modele"); }}
                  onFocus={() => setOpenField("modele")}
                  onBlur={() => setTimeout(() => setOpenField(null), 150)} />
                {openField === "modele" && !selectedVehicule && modeleSuggestions.length > 0 && (
                  <SuggestList items={modeleSuggestions} onPick={(v) => { setModele(v); setOpenField(null); }} />
                )}
              </div>
            </div>
            {selectedVehicule && (
              <p className="text-xs font-medium text-success">✓ Véhicule existant</p>
            )}
            {!selectedVehicule && plate.trim() && marque.trim() && modele.trim() && (
              <p className="text-xs font-medium text-accent">＋ Sera ajouté à la liste Duparc</p>
            )}
          </div>)}

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
          <Button onClick={handleSubmit} disabled={isLoading || !vehiculeValid}>
            <PackageMinus className="mr-2 h-4 w-4" />
            {isLoading ? "Enregistrement..." : "Confirmer la sortie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuggestList({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
      {items.map((it) => (
        <button key={it} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(it)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
          {it}
        </button>
      ))}
    </div>
  );
}
