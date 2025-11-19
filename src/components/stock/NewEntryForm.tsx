import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

export function NewEntryForm({ open, onOpenChange, onSuccess }: NewEntryFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const validateForm = () => {
    if (!formData.entryType) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type d'entrée",
        variant: "destructive",
      });
      return false;
    }

    for (const item of items) {
      if (!item.articleId || !item.quantity || !item.unitPrice) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs des articles",
          variant: "destructive",
        });
        return false;
      }
      if (parseFloat(item.quantity) <= 0) {
        toast({
          title: "Erreur",
          description: "La quantité doit être supérieure à 0",
          variant: "destructive",
        });
        return false;
      }
      if (parseFloat(item.unitPrice) < 0) {
        toast({
          title: "Erreur",
          description: "Le prix unitaire doit être positif ou nul",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Créer l'entrée principale
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

      // Créer les items
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

      // Reset form
      setFormData({
        entryDate: new Date().toISOString().split("T")[0],
        entryType: "achat",
        supplierId: "",
        invoiceNumber: "",
        location: "",
        notes: "",
      });
      setItems([{ articleId: "", quantity: "", unitPrice: "" }]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📥 Nouvelle entrée de stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Informations générales */}
          <div>
            <h3 className="font-semibold mb-4">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entry-date">Date d'entrée*</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, entryDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="entry-type">Type d'entrée*</Label>
                <Select
                  value={formData.entryType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, entryType: value })
                  }
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
                <Label htmlFor="supplier">Fournisseur</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice">N° Facture/BL</Label>
                <Input
                  id="invoice"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  placeholder="FAC-2025-001"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="location">Emplacement de stockage</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Entrepôt A - Allée 3"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Articles à entrer*</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label>Article</Label>
                    <Select
                      value={item.articleId}
                      onValueChange={(value) => updateItem(index, "articleId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
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
                  <div className="col-span-2">
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Prix unitaire</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Total</Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md font-semibold">
                      {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)} €
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">TOTAL GÉNÉRAL</p>
                <p className="text-2xl font-bold">
                  {calculateTotal().toFixed(2)} €
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Notes */}
          <div>
            <Label htmlFor="notes">Notes/Commentaires</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
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
            {isLoading ? "Enregistrement..." : "Enregistrer l'entrée"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
