import { vehicleLabel, maskSivPlate, isValidSivPlate } from "@/lib/vehicleFormatting";
import { exitVehicleInput } from "@/lib/exitVehicleInput";
import { StockQuantitySelector } from "./shared/StockQuantitySelector";
import { StockArticleSearch } from "./shared/StockArticleSearch";
import { QuickArticleFields } from "./shared/QuickArticleFields";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { quickEntryArticle } from "@/lib/simpleEntryInput";
import { needsVehicleForExit } from "@/lib/vehicleRequirement";
import { useState, useEffect, useRef } from "react";
import { PackageMinus, X } from "lucide-react";
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
  categorie: string;
  sous_categorie: string | null;
  marque: string | null;
  code_barre: string | null;
  stock_min: number;
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
  const [quantity, setQuantity] = useState(1);
  const [exitType, setExitType] = useState("consommation");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const quantityRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const [notes, setNotes] = useState("");
  const [manualVehicle, setManualVehicle] = useState(false);
  const [manualPlate, setManualPlate] = useState("");
  const [cats, setCats] = useState<{ id: string; nom: string; parent_id: string | null; requires_vehicle: boolean | null }[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
      setArticleId("");
      setQuantity(1);
      setExitType("consommation");
      setMarque("");
      setModele("");
      setSelectedVehicule(null);
      setNotes(""); setSearch(""); setFilterCategory(""); setFilterSubcategory(""); setFilterBrand("");
      setScannedCode(null); setScannerOpen(false); setCreating(false); setManualVehicle(false); setManualPlate("");
    }
  }, [open]);

  const selectedArt = articles.find((a) => a.id === articleId);
  const needsVehicle = needsVehicleForExit(selectedArt, cats);
  const manualPlateValid = isValidSivPlate(manualPlate);
  const vehiculeValid = selectedVehicule ? true : manualVehicle ? (manualPlateValid || (!needsVehicle && !manualPlate)) : !needsVehicle;
  const pick = (a: Article) => {
    setArticleId(a.id); setCreating(false); setQuantity(1);
    setTimeout(() => quantityRef.current?.focus(), 50);
  };
  const beginCreate = () => {
    setReference(search.trim()); setDesignation(""); setCategory(filterCategory);
    setSubcategory(filterSubcategory); setBrand(filterBrand); setPrice(""); setCreating(true);
  };
  const handleScan = (code: string) => {
    setScannerOpen(false);
    const article = articles.find((a) => a.code_barre === code || a.reference === code);
    if (article) pick(article);
    else { setSearch(code); setScannedCode(code); }
  };
  const createAndSelect = async () => {
    if (savingRef.current) return;
    savingRef.current = true; setIsLoading(true);
    try {
      const article = quickEntryArticle({ reference, designation, categorie: category, sous_categorie: subcategory, marque: brand, code_barre: scannedCode, price });
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Veuillez vous connecter pour créer un article");
      const { data, error } = await supabase.from("articles").insert({ ...article, user_id: auth.user.id })
        .select("id, reference, designation, categorie, sous_categorie, marque, code_barre, stock, stock_min, vehicule_required").single();
      if (error) throw error;
      if (!data) throw new Error("La création de l’article n’a pas été confirmée");
      setArticles((list) => [...list, data]); pick(data);
      toast({ title: "Article créé", description: "Stock initial : 0", className: "bg-success text-success-foreground border-success" });
    } catch (error: unknown) {
      toast({ title: "Erreur", description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible de créer l’article", variant: "destructive" });
    } finally { savingRef.current = false; setIsLoading(false); }
  };

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

  const fetchData = async () => {
    setLoading(true); setLoadFailed(false);
    try {
      const [articlesRes, vehiculesRes, catsRes] = await Promise.all([
        (async () => {
          const all: Article[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.from("articles").select("id, reference, designation, stock, stock_min, marque, code_barre, vehicule_required, categorie, sous_categorie")
              .is("archived_at", null).order("designation").order("id").range(offset, offset + 999);
            if (error) throw error;
            all.push(...(data || []));
            if ((data || []).length < 1000) return all;
          }
        })(),
        supabase.from("vehicules").select("id, immatriculation, marque, modele").order("immatriculation"),
        supabase.from("categories").select("id, nom, parent_id, requires_vehicle"),
      ]);
      if (catsRes.error) throw catsRes.error;
      setCats(catsRes.data || []);
      if (vehiculesRes.error) throw vehiculesRes.error;
      setArticles(articlesRes);
      setVehicules(vehiculesRes.data || []);
    } catch (error: unknown) {
      setLoadFailed(true);
      toast({ title: "Erreur", description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible de charger les données", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (savingRef.current || loading || loadFailed) return;
    if (!articleId) {
      toast({ title: "Erreur", description: "Sélectionnez un article", variant: "destructive" });
      return;
    }
    const qty = quantity;
    if (!Number.isSafeInteger(qty) || qty < 1) {
      toast({ title: "Erreur", description: "Quantité invalide", variant: "destructive" });
      return;
    }

    if (!vehiculeValid) {
      toast({ title: "Véhicule obligatoire pour cette catégorie d'article", description: "Sélectionnez un véhicule de la flotte ou saisissez-en un.", variant: "destructive" });
      return;
    }

    savingRef.current = true;
    setIsLoading(true);
    try {
      // Existing notes are the schema's free-text equivalent of vehicle_info.
      // Manual mode never resolves or checks a fleet vehicle, even with a stale selection.
      const vehicleFields = exitVehicleInput({ manual: manualVehicle, fleetId: selectedVehicule?.id, plate: manualPlate, brand: marque, model: modele, notes });

      // exit_number laissé vide → le trigger Supabase (trigger_set_exit_number)
      // génère automatiquement le numéro séquentiel SOR-YYYY-XXXXXX avant l'INSERT.
      // Le décrément de articles.stock est aussi géré côté Supabase par le trigger
      // trigger_decrease_stock_on_exit après INSERT dans stock_exit_items.
      const { data: exit, error: exitError } = await supabase
        .from("stock_exits")
        .insert([{
          exit_number: "",        // sera remplacé par le trigger BEFORE INSERT
          exit_type: exitType,
          ...vehicleFields,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (exitError) throw exitError;
      if (!exit) throw new Error("La sortie n’a pas été confirmée");

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
    } catch (error: unknown) {
      console.error("Erreur création sortie:", error);
      // Le trigger Supabase lève une exception si stock insuffisant côté DB —
      // on affiche le message exact pour que l'utilisateur comprenne.
      toast({
        title: "Erreur",
        description: error && typeof error === "object" && "message" in error ? String(error.message) : "Impossible de créer la sortie",
        variant: "destructive",
      });
    } finally {
      savingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open && !scannerOpen} onOpenChange={(v) => { if (!savingRef.current) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📤 Nouvelle sortie de stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!selectedArt && !creating ? (
            <StockArticleSearch {...{ articles, loading, loadFailed, search, setSearch, filterCategory, setFilterCategory, filterSubcategory, setFilterSubcategory, filterBrand, setFilterBrand, scannedCode, setScannedCode }} onPick={pick} onCreate={beginCreate} onScan={() => setScannerOpen(true)} />
          ) : creating ? (
            <fieldset disabled={isLoading} className="space-y-3">
              <QuickArticleFields {...{ reference, setReference, designation, setDesignation, category, setCategory, subcategory, setSubcategory, brand, setBrand, articles }} categories={cats} showBrand />
              <Label htmlFor="exit-create-price">Prix unitaire (optionnel)</Label>
              <Input id="exit-create-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Button onClick={createAndSelect} className="w-full">{isLoading ? "Création…" : "Créer l’article et continuer"}</Button>
              <Button variant="outline" onClick={() => setCreating(false)} className="w-full">Annuler</Button>
            </fieldset>
          ) : selectedArt && (
            <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 p-3">
              <div className="min-w-0"><div className="font-bold break-words">{selectedArt.designation}</div><div className="text-xs text-muted-foreground break-words">{selectedArt.reference} · {selectedArt.marque || "Sans marque"} · Stock : {selectedArt.stock}</div></div>
              <Button variant="ghost" size="icon" aria-label="Changer d’article" disabled={isLoading} onClick={() => setArticleId("")}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {selectedArt && !creating && <>

          <div>
            <Label htmlFor="quantity">Quantité *</Label>
            <StockQuantitySelector
              ref={quantityRef}
              id="quantity"
              value={quantity}
              onChange={setQuantity}
              available={selectedArt.stock}
              disabled={isLoading}
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

          <div className="space-y-3">
            <Label htmlFor="exit-fleet">Véhicule concerné{needsVehicle ? " *" : " (optionnel)"}</Label>
            {!manualVehicle ? (
              <SearchableSelect id="exit-fleet" value={selectedVehicule?.id || ""} options={vehicules.map((v) => ({ value: v.id, label: vehicleLabel(v), keywords: [v.immatriculation, v.marque, v.modele].filter(Boolean).join(" ") }))}
                placeholder="Véhicule de la flotte" searchPlaceholder="Immatriculation, marque ou modèle…" emptyMessage="Aucun véhicule trouvé"
                onValueChange={(id) => { setSelectedVehicule(vehicules.find((v) => v.id === id) || null); }}
                renderEmptyAction={(q, close) => (
                  <Button type="button" variant="ghost" className="w-full justify-start text-primary" onClick={() => {
                    close(); setSelectedVehicule(null); setManualVehicle(true);
                    const raw = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setManualPlate(/^[A-Z]{2}\d/.test(raw) ? maskSivPlate(raw) : ""); setMarque(""); setModele("");
                  }}>🚗 Saisir manuellement l'immatriculation</Button>
                )} />
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                <div><Label htmlFor="exit-manual-plate">Immatriculation{needsVehicle ? " *" : ""}</Label>
                  <Input id="exit-manual-plate" value={manualPlate} onChange={(e) => setManualPlate(maskSivPlate(e.target.value))} placeholder="AA-000-AA" maxLength={9} autoCapitalize="characters" />
                  {manualPlate && !manualPlateValid && <p className="text-xs text-destructive mt-1">Format attendu : AA-000-AA</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="exit-free-brand">Marque (optionnel)</Label><AutocompleteInput id="exit-free-brand" value={marque} onValueChange={(v) => setMarque(v.toUpperCase())} suggestions={marqueSuggestions} placeholder="Ex: KIA" /></div>
                  <div><Label htmlFor="exit-free-model">Modèle (optionnel)</Label><AutocompleteInput id="exit-free-model" value={modele} onValueChange={(v) => setModele(titleCase(v))} suggestions={modeleSuggestions} placeholder="Ex: Picanto" /></div>
                </div>
                <p className="text-xs text-muted-foreground">Ce véhicule ne sera pas ajouté à la flotte</p>
                <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={() => { setManualVehicle(false); setManualPlate(""); setMarque(""); setModele(""); }}>← Rechercher dans la flotte</Button>
              </div>
            )}
            {needsVehicle && !vehiculeValid && <p role="alert" className="text-xs text-destructive">Véhicule obligatoire pour cette catégorie d'article</p>}
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
          </>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || loading || loadFailed || !selectedArt || creating || !vehiculeValid}>
            <PackageMinus className="mr-2 h-4 w-4" />
            {isLoading ? "Enregistrement..." : "Valider la sortie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <BarcodeScanner isOpen={scannerOpen} onScanResult={handleScan} onClose={() => setScannerOpen(false)} />
    </>
  );
}
