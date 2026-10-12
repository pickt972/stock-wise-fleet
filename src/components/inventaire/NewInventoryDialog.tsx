import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Scope = "all" | "category" | "location";

export function NewInventoryDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [scopeId, setScopeId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["inv-scope-categories"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, nom, parent_id").eq("actif", true).order("sort_order");
      if (error) throw error;
      const roots = data.filter((c) => !c.parent_id);
      return roots.flatMap((r) => [
        { id: r.id, label: r.nom },
        ...data.filter((c) => c.parent_id === r.id).map((c) => ({ id: c.id, label: `${r.nom} › ${c.nom}` })),
      ]);
    },
  });
  const { data: emplacements = [] } = useQuery({
    queryKey: ["inv-scope-emplacements"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("emplacements").select("id, nom").eq("actif", true).order("nom");
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("open_inventory" as any, {
      p_label: label, p_scope_type: scope, p_scope_id: scope === "all" ? null : scopeId,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Impossible d'ouvrir l'inventaire", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Inventaire ouvert" });
    setLabel(""); setScope("all"); setScopeId("");
    onCreated(data as unknown as string);
  };

  const options = scope === "category" ? categories : emplacements.map((e) => ({ id: e.id, label: e.nom }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel inventaire</DialogTitle>
          <DialogDescription>Le stock théorique des articles est figé à l'ouverture.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-label">Libellé (facultatif)</Label>
            <Input id="inv-label" placeholder="Inventaire mensuel octobre" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Périmètre</Label>
            <RadioGroup value={scope} onValueChange={(v) => { setScope(v as Scope); setScopeId(""); }}>
              <label className="flex items-center gap-2"><RadioGroupItem value="all" /> Tous les articles</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="category" /> Une catégorie</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="location" /> Un emplacement</label>
            </RadioGroup>
          </div>
          {scope !== "all" && (
            <Select value={scopeId} onValueChange={setScopeId}>
              <SelectTrigger><SelectValue placeholder={scope === "category" ? "Choisir une catégorie" : "Choisir un emplacement"} /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving || (scope !== "all" && !scopeId)}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ouvrir l'inventaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
