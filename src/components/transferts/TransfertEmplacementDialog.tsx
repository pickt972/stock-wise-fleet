import { useState, useEffect } from "react";
import { ArrowLeftRight, Check, ChevronsUpDown, Package, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Article {
  id: string;
  reference: string;
  designation: string;
  marque: string;
  stock: number;
  emplacement_id?: string;
  categorie?: string;
}

interface Accessoire {
  id: string;
  nom: string;
  type: string;
  emplacement_actuel: string;
  etat: string;
}

interface Emplacement {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
}

type SelectedItem = 
  | { kind: "article"; data: Article }
  | { kind: "accessoire"; data: Accessoire };

interface TransfertEmplacementDialogProps {
  onTransfertCompleted?: () => void;
  preselectedArticleId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransfertEmplacementDialog({ onTransfertCompleted, preselectedArticleId, open, onOpenChange }: TransfertEmplacementDialogProps) {
  const [internalOpen, setInternalOpen] = useState(!!preselectedArticleId);
  const [articlePopoverOpen, setArticlePopoverOpen] = useState(false);
  const isDialogOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };
  const [isCreating, setIsCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [accessoires, setAccessoires] = useState<Accessoire[]>([]);
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [formData, setFormData] = useState({
    quantity: 1,
    emplacementDestinationId: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (preselectedArticleId) {
      handleOpenChange(true);
    }
  }, [preselectedArticleId]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchArticles();
      fetchAccessoires();
      fetchEmplacements();
      if (preselectedArticleId) {
        // Will be resolved after articles load
      }
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (preselectedArticleId && articles.length > 0 && !selectedItem) {
      const found = articles.find(a => a.id === preselectedArticleId);
      if (found) setSelectedItem({ kind: "article", data: found });
    }
  }, [preselectedArticleId, articles]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, reference, designation, marque, stock, emplacement_id, categorie')
        .gt('stock', 0)
        .order('designation');
      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Erreur chargement articles:', error);
    }
  };

  const fetchAccessoires = async () => {
    try {
      const { data, error } = await supabase
        .from('accessoires')
        .select('id, nom, type, emplacement_actuel, etat')
        .eq('actif', true)
        .order('nom');
      if (error) throw error;
      setAccessoires(data || []);
    } catch (error: any) {
      console.error('Erreur chargement accessoires:', error);
    }
  };

  const fetchEmplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('emplacements')
        .select('id, nom, description, actif')
        .eq('actif', true)
        .order('nom');
      if (error) throw error;
      setEmplacements(data || []);
    } catch (error: any) {
      console.error('Erreur chargement emplacements:', error);
    }
  };

  const getEmplacementNom = (emplacementId: string | null | undefined) => {
    if (!emplacementId) return "Aucun emplacement";
    const emplacement = emplacements.find(e => e.id === emplacementId);
    return emplacement?.nom || "Emplacement inconnu";
  };

  const getSelectedLabel = () => {
    if (!selectedItem) return "Rechercher un article ou accessoire...";
    if (selectedItem.kind === "article") {
      return `${selectedItem.data.reference} - ${selectedItem.data.designation}`;
    }
    return `${selectedItem.data.nom} (${selectedItem.data.type})`;
  };

  const getSourceInfo = () => {
    if (!selectedItem) return null;
    if (selectedItem.kind === "article") {
      return {
        emplacement: getEmplacementNom(selectedItem.data.emplacement_id),
        stock: selectedItem.data.stock,
      };
    }
    return {
      emplacement: selectedItem.data.emplacement_actuel,
      stock: 1,
    };
  };

  const createTransfert = async () => {
    if (!selectedItem || !formData.emplacementDestinationId) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      if (selectedItem.kind === "accessoire") {
        await transferAccessoire();
      } else {
        await transferArticle();
      }

      setSelectedItem(null);
      setFormData({ quantity: 1, emplacementDestinationId: "" });
      handleOpenChange(false);
      onTransfertCompleted?.();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible d'effectuer le transfert", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const transferAccessoire = async () => {
    if (selectedItem?.kind !== "accessoire") return;
    const acc = selectedItem.data;
    const destEmplacement = emplacements.find(e => e.id === formData.emplacementDestinationId);
    const destName = destEmplacement?.nom || formData.emplacementDestinationId;

    if (acc.emplacement_actuel === destName) {
      throw new Error("L'accessoire est déjà dans cet emplacement");
    }

    // Log transfer
    const { error: transferError } = await supabase
      .from('accessoire_transferts')
      .insert([{
        accessoire_id: acc.id,
        site_depart: acc.emplacement_actuel,
        site_arrivee: destName,
        motif: `Transfert vers ${destName}`,
        transferred_by: user?.id,
      }]);
    if (transferError) throw transferError;

    // Update location
    const { error: updateError } = await supabase
      .from('accessoires')
      .update({ emplacement_actuel: destName, updated_at: new Date().toISOString() })
      .eq('id', acc.id);
    if (updateError) throw updateError;

    toast({ title: "Succès", description: `Accessoire "${acc.nom}" transféré vers ${destName}` });
  };

  const transferArticle = async () => {
    if (selectedItem?.kind !== "article") return;
    const article = selectedItem.data;

    if (article.stock < formData.quantity) {
      throw new Error(`Stock insuffisant. Disponible: ${article.stock}`);
    }
    if (article.emplacement_id === formData.emplacementDestinationId) {
      throw new Error("L'article est déjà dans cet emplacement");
    }

    const emplacementSource = getEmplacementNom(article.emplacement_id);
    const emplacementDestination = getEmplacementNom(formData.emplacementDestinationId);

    // Sortie movement
    const { error: sortieError } = await supabase
      .from('stock_movements')
      .insert([{ article_id: article.id, type: 'sortie', quantity: formData.quantity, motif: `Transfert vers ${emplacementDestination}`, user_id: user?.id }]);
    if (sortieError) throw sortieError;

    // Entrée movement
    const { error: entreeError } = await supabase
      .from('stock_movements')
      .insert([{ article_id: article.id, type: 'entree', quantity: formData.quantity, motif: `Transfert depuis ${emplacementSource}`, user_id: user?.id }]);
    if (entreeError) throw entreeError;

    const newStock = article.stock - formData.quantity;
    if (newStock === 0) {
      const { error } = await supabase.from('articles').delete().eq('id', article.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('articles').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', article.id);
      if (error) throw error;
    }

    // Check existing article at destination
    const emplacementDestData = emplacements.find(e => e.id === formData.emplacementDestinationId);
    const { data: existingArticle, error: searchError } = await supabase
      .from('articles')
      .select('id, stock')
      .eq('reference', article.reference)
      .eq('emplacement_id', formData.emplacementDestinationId)
      .single();

    if (searchError && searchError.code !== 'PGRST116') throw searchError;

    if (existingArticle) {
      const { error } = await supabase.from('articles').update({ stock: existingArticle.stock + formData.quantity, updated_at: new Date().toISOString() }).eq('id', existingArticle.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('articles').insert([{
        reference: article.reference, designation: article.designation, marque: article.marque,
        categorie: article.categorie || '', stock: formData.quantity, stock_min: 0, stock_max: 100,
        prix_achat: 0, emplacement_id: formData.emplacementDestinationId,
        emplacement: emplacementDestData?.nom || '', user_id: user?.id
      }]);
      if (error) throw error;
    }

    toast({ title: "Succès", description: `Transfert effectué: ${formData.quantity} ${article.designation} vers ${emplacementDestination}` });
  };

  const sourceInfo = getSourceInfo();
  const isAccessoire = selectedItem?.kind === "accessoire";

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-background hover:bg-accent flex-shrink-0 px-3 h-9 text-sm whitespace-nowrap">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Transfert emplacement</span>
          <span className="sm:hidden">Transférer</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transfert entre emplacements
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Article ou accessoire à transférer *</Label>
            <Popover open={articlePopoverOpen} onOpenChange={setArticlePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={articlePopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">{getSelectedLabel()}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tapez pour rechercher..." />
                  <CommandList>
                    <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
                    {articles.filter(a => a.stock > 0).length > 0 && (
                      <CommandGroup heading="Articles">
                        {articles
                          .filter(a => a.stock > 0)
                          .map((article) => (
                            <CommandItem
                              key={`art-${article.id}`}
                              value={`article ${article.reference} ${article.designation} ${article.marque}`}
                              onSelect={() => {
                                setSelectedItem({ kind: "article", data: article });
                                setFormData(prev => ({ ...prev, quantity: 1 }));
                                setArticlePopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedItem?.kind === "article" && selectedItem.data.id === article.id ? "opacity-100" : "opacity-0")} />
                              <Package className="mr-1.5 h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{article.reference} - {article.designation} (Stock: {article.stock})</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                    {accessoires.length > 0 && (
                      <CommandGroup heading="Accessoires">
                        {accessoires.map((acc) => (
                          <CommandItem
                            key={`acc-${acc.id}`}
                            value={`accessoire ${acc.nom} ${acc.type} ${acc.emplacement_actuel}`}
                            onSelect={() => {
                              setSelectedItem({ kind: "accessoire", data: acc });
                              setFormData(prev => ({ ...prev, quantity: 1 }));
                              setArticlePopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedItem?.kind === "accessoire" && selectedItem.data.id === acc.id ? "opacity-100" : "opacity-0")} />
                            <Baby className="mr-1.5 h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{acc.nom} ({acc.type}) — {acc.emplacement_actuel}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {sourceInfo && (
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {isAccessoire ? "Accessoire" : "Article"}
                </Badge>
                <span>Emplacement: {sourceInfo.emplacement}</span>
                {!isAccessoire && <span>• Stock: {sourceInfo.stock}</span>}
              </div>
            )}
          </div>

          {!isAccessoire && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité à transférer *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={sourceInfo?.stock || 1}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Emplacement de destination *</Label>
            <Select
              value={formData.emplacementDestinationId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, emplacementDestinationId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'emplacement de destination" />
              </SelectTrigger>
              <SelectContent>
                {emplacements
                  .filter(emp => {
                    if (selectedItem?.kind === "article") return selectedItem.data.emplacement_id !== emp.id;
                    if (selectedItem?.kind === "accessoire") return selectedItem.data.emplacement_actuel !== emp.nom;
                    return true;
                  })
                  .map((emplacement) => (
                    <SelectItem key={emplacement.id} value={emplacement.id}>
                      {emplacement.nom}
                      {emplacement.description && ` - ${emplacement.description}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={createTransfert} disabled={isCreating} className="w-full sm:w-auto">
              {isCreating ? "Transfert en cours..." : "Effectuer le transfert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
