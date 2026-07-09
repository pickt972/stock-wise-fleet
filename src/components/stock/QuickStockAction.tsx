import { useState, useEffect } from "react";
import { Plus, Minus, ArrowLeft, Package, MapPin, Tag, Car, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  categorie: string;
  stock: number;
  stock_min: number;
  prix_achat: number;
  emplacement: string;
}

interface QuickStockActionProps {
  article: Article;
  onBack: () => void;
  onComplete: () => void;
}

export function QuickStockAction({ article, onBack, onComplete }: QuickStockActionProps) {
  const [mode, setMode] = useState<"choose" | "add" | "remove">("choose");
  const [quantity, setQuantity] = useState(1);
  const [motif, setMotif] = useState("");
  const [vehiculeId, setVehiculeId] = useState<string>("");
  const [vehicules, setVehicules] = useState<Array<{ id: string; label: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Charger les véhicules au montage
  useEffect(() => {
    supabase
      .from("vehicules")
      .select("id, marque, modele, immatriculation")
      .order("immatriculation")
      .then(({ data }) => {
        setVehicules(
          (data || []).map((v) => ({
            id: v.id,
            label: `${v.immatriculation || "—"} · ${v.marque} ${v.modele}`,
          }))
        );
      });
  }, []);

  const getStockBadge = () => {
    if (article.stock === 0) return { variant: "destructive" as const, label: "Rupture" };
    if (article.stock <= article.stock_min) return { variant: "secondary" as const, label: "Stock faible" };
    return { variant: "default" as const, label: "En stock" };
  };

  const stockBadge = getStockBadge();

  const handleSubmit = async () => {
    if (quantity <= 0) return;
    if (mode === "remove" && quantity > article.stock) {
      toast({ title: "Quantité insuffisante", description: `Stock disponible : ${article.stock}`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const movementType = mode === "add" ? "entree" : "sortie";
      const motifFinal = motif.trim() || (mode === "add" ? "Ajout rapide via scan" : "Sortie rapide via scan");

      // RPC SECURITY DEFINER — bypass les conflits RLS, fait mouvement + update stock en une transaction
      const { error } = await supabase.rpc("insert_stock_movement", {
        p_article_id: article.id,
        p_type: movementType,
        p_quantity: quantity,
        p_motif: motifFinal,
        p_vehicule_id: vehiculeId || null,
      });

      if (error) throw error;

      toast({
        title: mode === "add" ? "✅ Stock ajouté" : "✅ Stock retiré",
        description: `${quantity} × ${article.designation}`,
      });

      onComplete();
    } catch (error: any) {
      console.error("Erreur mouvement stock:", error);
      const msg = error?.message?.includes("insuffisant")
        ? "Stock insuffisant pour cette sortie."
        : error?.message || "Impossible d'enregistrer le mouvement";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Article Info Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <h2 className="font-bold text-lg leading-tight truncate">{article.designation}</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{article.marque}</span>
                <span>•</span>
                <span>{article.categorie}</span>
              </div>
              {article.emplacement && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />{article.emplacement}
                </p>
              )}
            </div>
            <Badge variant={stockBadge.variant} className="text-xs flex-shrink-0">
              {stockBadge.label}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{article.stock}</span>
              <span className="text-sm text-muted-foreground">en stock</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">{article.reference}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Action Selection */}
      {mode === "choose" && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setMode("add")}
            className="h-24 flex-col gap-2 text-lg bg-success hover:bg-success/90 text-success-foreground shadow-md"
          >
            <Plus className="h-8 w-8" />
            Entrée
          </Button>
          <Button
            onClick={() => setMode("remove")}
            className="h-24 flex-col gap-2 text-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md"
            disabled={article.stock === 0}
          >
            <Minus className="h-8 w-8" />
            Sortie
          </Button>
        </div>
      )}

      {/* Quantity Input */}
      {(mode === "add" || mode === "remove") && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {mode === "add" ? "➕ Quantité à ajouter" : "➖ Quantité à retirer"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                Changer
              </Button>
            </div>

            {/* Big quantity controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-xl"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <Input
                type="number"
                min={1}
                max={mode === "remove" ? article.stock : 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-16 text-center text-3xl font-bold border-2"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-xl"
                onClick={() => setQuantity(quantity + 1)}
                disabled={mode === "remove" && quantity >= article.stock}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>

            {/* Quick quantity buttons */}
            <div className="flex justify-center gap-2">
              {[1, 2, 5, 10].map((n) => (
                <Button
                  key={n}
                  variant={quantity === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuantity(n)}
                  className="min-w-[40px]"
                >
                  {n}
                </Button>
              ))}
            </div>

            {mode === "remove" && (
              <p className="text-center text-sm text-muted-foreground">
                Stock après sortie : <span className="font-semibold">{article.stock - quantity}</span>
              </p>
            )}
            {mode === "add" && (
              <p className="text-center text-sm text-muted-foreground">
                Stock après entrée : <span className="font-semibold">{article.stock + quantity}</span>
              </p>
            )}

            <Textarea
              placeholder="Note (optionnel)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="resize-none"
              rows={2}
            />

            {/* Véhicule — uniquement pour les sorties */}
            {mode === "remove" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  Véhicule concerné
                  <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
                </div>
                <Select value={vehiculeId} onValueChange={setVehiculeId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner un véhicule…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Aucun véhicule —</SelectItem>
                    {vehicules.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || quantity <= 0}
              className={`w-full h-14 text-lg font-semibold ${
                mode === "add"
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }`}
            >
              {isSubmitting
                ? "Enregistrement..."
                : mode === "add"
                ? `Ajouter ${quantity} au stock`
                : `Retirer ${quantity} du stock`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Back button */}
      <Button
        variant="outline"
        className="w-full h-12"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Scanner un autre article
      </Button>
    </div>
  );
}
