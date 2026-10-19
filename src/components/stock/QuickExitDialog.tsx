import { useState, useEffect } from "react";
import { Minus, Plus, PackageMinus, Car } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { needsVehicleForExit, type VehicleCategoryNode } from "@/lib/vehicleRequirement";

interface QuickExitArticle {
  id: string;
  reference: string;
  designation: string;
  stock: number;
}

interface QuickExitDialogProps {
  article: QuickExitArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

interface VehiculeOption {
  id: string;
  label: string;
}

export function QuickExitDialog({ article, open, onOpenChange, onDone }: QuickExitDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [vehicules, setVehicules] = useState<VehiculeOption[]>([]);
  const [vehiculeId, setVehiculeId] = useState("");
  const [vehiculeLibre, setVehiculeLibre] = useState("");
  const [needsVehicle, setNeedsVehicle] = useState(false);

  useEffect(() => {
    if (!open || !article) return;
    setQuantity(1);
    setVehiculeId("");
    setVehiculeLibre("");
    setNeedsVehicle(false);

    const load = async () => {
      const [artRes, catsRes, vehRes] = await Promise.all([
        supabase
          .from("articles")
          .select("vehicule_required, categorie, sous_categorie")
          .eq("id", article.id)
          .single(),
        supabase.from("categories").select("id, nom, parent_id, requires_vehicle"),
        supabase.from("vehicules").select("id, marque, modele, immatriculation").order("immatriculation"),
      ]);
      setVehicules(
        (vehRes.data || []).map((v) => ({
          id: v.id,
          label: `${v.immatriculation || "—"} · ${v.marque} ${v.modele}`,
        }))
      );
      if (artRes.data) {
        setNeedsVehicle(
          needsVehicleForExit(artRes.data, (catsRes.data as VehicleCategoryNode[]) || [])
        );
      }
    };
    load();
  }, [open, article?.id]);

  const vehicleFilled = !!vehiculeId || !!vehiculeLibre.trim();
  const vehicleValid = !needsVehicle || vehicleFilled;

  const handleConfirm = async () => {
    if (!article) return;
    if (quantity <= 0) {
      toast({ title: "Quantité invalide", variant: "destructive" });
      return;
    }
    if (quantity > article.stock) {
      toast({
        title: "Stock insuffisant",
        description: `Disponible : ${article.stock}`,
        variant: "destructive",
      });
      return;
    }
    if (!vehicleValid) {
      toast({
        title: "Véhicule obligatoire pour cette catégorie d'article",
        description: "Sélectionnez un véhicule de la flotte ou saisissez-en un.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const motif =
        vehiculeLibre.trim() && !vehiculeId
          ? `Sortie rapide (scan) — Véhicule : ${vehiculeLibre.trim()}`
          : "Sortie rapide (scan)";
      // RPC SECURITY DEFINER — mouvement + update stock en une transaction, bypass RLS
      const { error } = await supabase.rpc("insert_stock_movement", {
        p_article_id: article.id,
        p_type: "sortie",
        p_quantity: quantity,
        p_motif: motif,
        p_vehicule_id: vehiculeId || null,
      });

      if (error) throw error;

      toast({
        title: "✅ Sortie enregistrée",
        description: `-${quantity} × ${article.designation}`,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message || "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-destructive" />
            Sortie rapide
          </DialogTitle>
        </DialogHeader>

        {article && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="font-semibold text-base truncate">{article.designation}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {article.reference} · stock actuel : <span className="font-semibold text-foreground">{article.stock}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité à sortir</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={submitting}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={article.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-14 text-center text-2xl font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => setQuantity((q) => Math.min(article.stock, q + 1))}
                  disabled={submitting}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div
              className={`rounded-xl border-2 p-3 space-y-2 transition-colors ${
                vehicleFilled
                  ? "border-primary/40 bg-primary/5"
                  : needsVehicle
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-dashed border-muted-foreground/30 bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Car className={`h-4 w-4 ${needsVehicle && !vehicleFilled ? "text-destructive" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  Véhicule concerné
                  {needsVehicle && !vehicleFilled && (
                    <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                      REQUIS
                    </span>
                  )}
                </p>
              </div>
              <Select value={vehiculeId} onValueChange={(v) => { setVehiculeId(v); if (v) setVehiculeLibre(""); }}>
                <SelectTrigger className={`h-11 bg-background ${needsVehicle && !vehicleFilled ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="🚘 Véhicule de la flotte…" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!vehiculeId && (
                <div>
                  <Label htmlFor="vehicule-libre" className="text-xs text-muted-foreground">
                    ou véhicule hors flotte
                  </Label>
                  <Input
                    id="vehicule-libre"
                    value={vehiculeLibre}
                    onChange={(e) => setVehiculeLibre(e.target.value)}
                    placeholder="Ex: BYD Atto 3, AB-123-CD…"
                    className="h-11"
                  />
                </div>
              )}
              {needsVehicle && !vehicleFilled && (
                <p className="text-xs text-destructive font-medium">
                  Véhicule obligatoire pour cette catégorie d'article
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="sm:w-auto w-full"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !article || !vehicleValid}
            className="sm:w-auto w-full h-14 sm:h-10 text-base font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {submitting ? "Enregistrement..." : `Confirmer sortie (${quantity})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
