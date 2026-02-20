import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Package, FileText, ClipboardList } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  reference: string;
  designation: string;
}

interface Fournisseur {
  id: string;
  nom: string;
}

interface EntryItem {
  articleId: string;
  quantity: string;
  unitPrice: string;
}

interface NewEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: "Informations", icon: FileText },
  { id: 2, label: "Articles", icon: Package },
  { id: 3, label: "Récapitulatif", icon: ClipboardList },
];

export function NewEntryForm({ open, onOpenChange, onSuccess }: NewEntryFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    entryType: "achat",
    supplierId: "",
    invoiceNumber: "",
    location: "",
    notes: "",
  });

  const [items, setItems] = useState<EntryItem[]>([
    { articleId: "", quantity: "", unitPrice: "" },
  ]);

  useEffect(() => {
    if (open) {
      fetchData();
      setCurrentStep(1);
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [articlesRes, fournisseursRes] = await Promise.all([
        supabase.from("articles").select("id, reference, designation").order("designation"),
        supabase.from("fournisseurs").select("id, nom").eq("actif", true).order("nom"),
      ]);

      if (articlesRes.error) throw articlesRes.error;
      if (fournisseursRes.error) throw fournisseursRes.error;

      setArticles(articlesRes.data || []);
      setFournisseurs(fournisseursRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setItems([...items, { articleId: "", quantity: "", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof EntryItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const validateStep1 = () => {
    if (!formData.entryType) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un type d'entrée", variant: "destructive" });
      return false;
    }
    if (formData.entryType === "achat" && !formData.supplierId) {
      toast({ title: "Erreur", description: "Le fournisseur est obligatoire pour un achat", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (const item of items) {
      if (!item.articleId || !item.quantity || !item.unitPrice) {
        toast({ title: "Erreur", description: "Veuillez remplir tous les champs des articles", variant: "destructive" });
        return false;
      }
      if (parseFloat(item.quantity) <= 0) {
        toast({ title: "Erreur", description: "La quantité doit être supérieure à 0", variant: "destructive" });
        return false;
      }
      if (parseFloat(item.unitPrice) < 0) {
        toast({ title: "Erreur", description: "Le prix unitaire doit être positif ou nul", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: entry, error: entryError } = await supabase
        .from("stock_entries")
        .insert([{
          entry_number: "",
          entry_type: formData.entryType,
          supplier_id: formData.supplierId || null,
          invoice_number: formData.invoiceNumber || null,
          location: formData.location || null,
          notes: formData.notes || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      const itemsToInsert = items.map((item) => ({
        entry_id: entry.id,
        article_id: item.articleId,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unitPrice),
      }));

      const { error: itemsError } = await supabase
        .from("stock_entry_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "✅ Entrée enregistrée",
        description: `${items.length} article(s) ajouté(s) au stock`,
      });

      onOpenChange(false);
      onSuccess();

      setFormData({
        entryDate: new Date().toISOString().split("T")[0],
        entryType: "achat",
        supplierId: "",
        invoiceNumber: "",
        location: "",
        notes: "",
      });
      setItems([{ articleId: "", quantity: "", unitPrice: "" }]);
      setCurrentStep(1);
    } catch (error: any) {
      console.error("Erreur création entrée:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'entrée",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEntryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      achat: "Achat fournisseur",
      retour: "Retour client",
      transfert: "Transfert entre sites",
      ajustement: "Ajustement inventaire",
      reparation: "Réparation terminée",
      autre: "Autre",
    };
    return labels[type] || type;
  };

  const getArticleName = (id: string) => {
    const a = articles.find((a) => a.id === id);
    return a ? `${a.reference} - ${a.designation}` : id;
  };

  const getSupplierName = (id: string) => {
    const f = fournisseurs.find((f) => f.id === id);
    return f ? f.nom : "—";
  };

  const progressValue = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📥 Nouvelle entrée de stock</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-colors",
                      isDone && "bg-primary border-primary text-primary-foreground",
                      isActive && "border-primary text-primary bg-primary/10",
                      !isActive && !isDone && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium hidden sm:inline",
                      isActive && "text-primary",
                      isDone && "text-primary",
                      !isActive && !isDone && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", isDone ? "bg-primary" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>

        {/* Step 1: Informations générales */}
        {currentStep === 1 && (
          <div className="space-y-4 py-2">
            <h3 className="font-semibold text-lg">Informations générales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entry-date">Date d'entrée *</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="entry-type">Type d'entrée *</Label>
                <Select
                  value={formData.entryType}
                  onValueChange={(value) => setFormData({ ...formData, entryType: value })}
                >
                  <SelectTrigger id="entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achat">Achat fournisseur</SelectItem>
                    <SelectItem value="retour">Retour client</SelectItem>
                    <SelectItem value="transfert">Transfert entre sites</SelectItem>
                    <SelectItem value="ajustement">Ajustement inventaire</SelectItem>
                    <SelectItem value="reparation">Réparation terminée</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supplier">Fournisseur {formData.entryType === "achat" ? "*" : ""}</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice">N° Facture/BL</Label>
                <Input
                  id="invoice"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="FAC-2025-001"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="location">Emplacement de stockage</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Entrepôt A - Allée 3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Articles */}
        {currentStep === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Articles à entrer</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Article {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    <Label>Article *</Label>
                    <Select
                      value={item.articleId}
                      onValueChange={(value) => updateItem(index, "articleId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un article..." />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.reference} - {a.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Quantité *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Prix unitaire *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="h-11 flex items-center px-3 bg-muted rounded-md font-semibold text-sm">
                        {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">TOTAL GÉNÉRAL</p>
                <p className="text-2xl font-bold">{calculateTotal().toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Récapitulatif */}
        {currentStep === 3 && (
          <div className="space-y-5 py-2">
            <h3 className="font-semibold text-lg">Récapitulatif</h3>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Informations</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">{formData.entryDate}</span>
                <span className="text-muted-foreground">Type :</span>
                <span className="font-medium">{getEntryTypeLabel(formData.entryType)}</span>
                <span className="text-muted-foreground">Fournisseur :</span>
                <span className="font-medium">{formData.supplierId ? getSupplierName(formData.supplierId) : "—"}</span>
                <span className="text-muted-foreground">N° Facture :</span>
                <span className="font-medium">{formData.invoiceNumber || "—"}</span>
                <span className="text-muted-foreground">Emplacement :</span>
                <span className="font-medium">{formData.location || "—"}</span>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Articles ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="font-medium flex-1 truncate mr-4">{getArticleName(item.articleId)}</span>
                    <span className="text-muted-foreground mr-4">x{item.quantity}</span>
                    <span className="font-semibold whitespace-nowrap">
                      {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">TOTAL</span>
                <span className="text-xl font-bold">{calculateTotal().toFixed(2)} €</span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes / Commentaires</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Footer navigation */}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Enregistrement..." : "✅ Confirmer l'entrée"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
