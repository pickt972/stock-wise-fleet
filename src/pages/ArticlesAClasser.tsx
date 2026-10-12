import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";

type Cat = { id: string; nom: string; parent_id: string | null };
type Art = { id: string; reference: string; designation: string; marque: string; categorie: string };

// Catégories où l'absence de sous-catégorie est acceptée
const LEAVE_EMPTY = ["Mobilier"];
// Catégories à reclasser manuellement (changer de catégorie)
const RECLASSIFY = ["Consommables", "Entretien"];

export default function ArticlesAClasser() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, { cat: string; sub: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { document.title = "Articles à classer | StockAuto"; }, []);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories-active-tree"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,nom,parent_id").eq("actif", true).order("sort_order");
      if (error) throw error;
      return data as Cat[];
    },
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles-sans-sous-categorie"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id,reference,designation,marque,categorie")
        .is("archived_at", null)
        .or("sous_categorie.is.null,sous_categorie.eq.")
        .order("categorie").order("designation");
      if (error) throw error;
      return data as Art[];
    },
  });

  const roots = useMemo(() => cats.filter(c => !c.parent_id), [cats]);
  const subsOf = (catName: string) => {
    const root = roots.find(r => r.nom === catName);
    return root ? cats.filter(c => c.parent_id === root.id) : [];
  };

  const groups = useMemo(() => {
    const m = new Map<string, Art[]>();
    articles.forEach(a => m.set(a.categorie, [...(m.get(a.categorie) || []), a]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [articles]);

  const save = async (a: Art) => {
    const e = edits[a.id];
    const cat = e?.cat || a.categorie;
    if (!e?.sub) return;
    setSaving(a.id);
    const { error } = await supabase.from("articles").update({ categorie: cat, sous_categorie: e.sub }).eq("id", a.id);
    setSaving(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Article classé", description: `${a.designation} → ${cat} › ${e.sub}` });
    setEdits(p => { const n = { ...p }; delete n[a.id]; return n; });
    qc.invalidateQueries({ queryKey: ["articles-sans-sous-categorie"] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Articles à classer</h1>
          <p className="text-muted-foreground text-sm">
            {articles.length} article{articles.length > 1 ? "s" : ""} sans sous-catégorie
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : groups.length === 0 ? (
          <EmptyState icon={Tags} title="Tout est classé" description="Aucun article sans sous-catégorie." />
        ) : groups.map(([catName, list]) => {
          const leave = LEAVE_EMPTY.includes(catName);
          const reclass = RECLASSIFY.includes(catName);
          return (
            <Card key={catName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  {catName}
                  <Badge variant="secondary">{list.length}</Badge>
                  {leave && <Badge variant="outline">Sans sous-catégorie acceptée</Badge>}
                  {reclass && <Badge variant="outline">À reclasser dans une autre catégorie</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map(a => {
                  const e = edits[a.id] || { cat: a.categorie, sub: "" };
                  const subs = subsOf(e.cat);
                  return (
                    <div key={a.id} className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{a.designation}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.reference} · {a.marque}</div>
                      </div>
                      {!leave && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select value={e.cat} onValueChange={v => setEdits(p => ({ ...p, [a.id]: { cat: v, sub: "" } }))}>
                            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                            <SelectContent>
                              {!roots.some(r => r.nom === a.categorie) && <SelectItem value={a.categorie}>{a.categorie}</SelectItem>}
                              {roots.map(r => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={e.sub} onValueChange={v => setEdits(p => ({ ...p, [a.id]: { cat: e.cat, sub: v } }))} disabled={subs.length === 0}>
                            <SelectTrigger className="w-full sm:w-52">
                              <SelectValue placeholder={subs.length ? "Sous-catégorie" : "Aucune sous-catégorie"} />
                            </SelectTrigger>
                            <SelectContent>
                              {subs.map(s => <SelectItem key={s.id} value={s.nom}>{s.nom}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => save(a)} disabled={!e.sub || saving === a.id}>
                            {saving === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            <span className="ml-1">Valider</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
