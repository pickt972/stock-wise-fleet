import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "./DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowRightLeft, History, Search, Baby, Filter, Trash2, Edit, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DEFAULT_TYPES = [
  { value: "siege_bebe", label: "Siège bébé" },
  { value: "rehausseur", label: "Rehausseur" },
  { value: "rehausseur_bas", label: "Rehausseur bas" },
  { value: "gps", label: "GPS" },
  { value: "autre", label: "Autre" },
];

const ETATS = [
  { value: "bon", label: "Bon", color: "bg-green-100 text-green-800" },
  { value: "use", label: "Usé", color: "bg-yellow-100 text-yellow-800" },
  { value: "a_remplacer", label: "À remplacer", color: "bg-red-100 text-red-800" },
  { value: "en_reparation", label: "En réparation", color: "bg-orange-100 text-orange-800" },
];

const SITES = ["CARRERE", "BOIS_ROUGE"];

interface Accessoire {
  id: string;
  nom: string;
  type: string;
  etat: string;
  emplacement_actuel: string;
  notes: string | null;
  actif: boolean;
  created_at: string;
}

interface Transfert {
  id: string;
  accessoire_id: string;
  site_depart: string;
  site_arrivee: string;
  motif: string | null;
  transferred_by: string | null;
  created_at: string;
}

export default function Accessoires() {
  const { toast } = useToast();
  const { isAdmin } = useRoleAccess();
  const [accessoires, setAccessoires] = useState<Accessoire[]>([]);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Dynamic types: default + custom from DB
  const [customTypes, setCustomTypes] = useState<{ value: string; label: string }[]>([]);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");

  const ACCESSOIRE_TYPES = useMemo(() => {
    const all = [...DEFAULT_TYPES];
    customTypes.forEach((ct) => {
      if (!all.find((t) => t.value === ct.value)) all.push(ct);
    });
    return all;
  }, [customTypes]);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedAccessoire, setSelectedAccessoire] = useState<Accessoire | null>(null);

  // Form
  const [formNom, setFormNom] = useState("");
  const [formType, setFormType] = useState("");
  const [formEtat, setFormEtat] = useState("bon");
  const [formSite, setFormSite] = useState("CARRERE");
  const [formNotes, setFormNotes] = useState("");

  // Transfer form
  const [transferSite, setTransferSite] = useState("");
  const [transferMotif, setTransferMotif] = useState("");

  useEffect(() => {
    document.title = "Accessoires | StockAuto";
    fetchAccessoires();
    fetchTransferts();
  }, []);

  const fetchAccessoires = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accessoires")
      .select("*")
      .eq("actif", true)
      .order("nom");
    if (!error) {
      setAccessoires(data || []);
      // Discover custom types from existing data
      const existingTypes = new Set((data || []).map((a) => a.type));
      const defaultValues = new Set(DEFAULT_TYPES.map((t) => t.value));
      const newCustom = Array.from(existingTypes)
        .filter((t) => !defaultValues.has(t))
        .map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ") }));
      setCustomTypes(newCustom);
    }
    setLoading(false);
  };

  const fetchTransferts = async () => {
    const { data } = await supabase
      .from("accessoire_transferts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setTransferts(data || []);
  };

  const handleCreate = async () => {
    if (!formNom.trim() || !formType) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("accessoires").insert({
      nom: formNom.trim(),
      type: formType,
      etat: formEtat as any,
      emplacement_actuel: formSite,
      notes: formNotes || null,
      created_by: userData?.user?.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Accessoire créé ✓" });
      resetForm();
      setShowCreate(false);
      fetchAccessoires();
    }
  };

  const handleEdit = async () => {
    if (!selectedAccessoire || !formNom.trim()) return;
    const { error } = await supabase.from("accessoires").update({
      nom: formNom.trim(),
      type: formType,
      etat: formEtat as any,
      notes: formNotes || null,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedAccessoire.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Accessoire modifié ✓" });
      setShowEdit(false);
      fetchAccessoires();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("accessoires").update({ actif: false }).eq("id", id);
    if (!error) {
      toast({ title: "Accessoire supprimé ✓" });
      fetchAccessoires();
    }
  };

  const handleTransfer = async () => {
    if (!selectedAccessoire || !transferSite) return;
    const { data: userData } = await supabase.auth.getUser();

    const { error: tError } = await supabase.from("accessoire_transferts").insert({
      accessoire_id: selectedAccessoire.id,
      site_depart: selectedAccessoire.emplacement_actuel,
      site_arrivee: transferSite,
      motif: transferMotif || null,
      transferred_by: userData?.user?.id,
    });
    if (tError) {
      toast({ title: "Erreur", description: tError.message, variant: "destructive" });
      return;
    }

    const { error: uError } = await supabase.from("accessoires").update({
      emplacement_actuel: transferSite,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedAccessoire.id);

    if (!uError) {
      toast({ title: "Transfert effectué ✓", description: `${selectedAccessoire.nom} → ${transferSite}` });
      setShowTransfer(false);
      setTransferSite("");
      setTransferMotif("");
      fetchAccessoires();
      fetchTransferts();
    }
  };

  const resetForm = () => {
    setFormNom("");
    setFormType("");
    setFormEtat("bon");
    setFormSite("CARRERE");
    setFormNotes("");
  };

  const openEdit = (acc: Accessoire) => {
    setSelectedAccessoire(acc);
    setFormNom(acc.nom);
    setFormType(acc.type);
    setFormEtat(acc.etat);
    setFormNotes(acc.notes || "");
    setShowEdit(true);
  };

  const openTransfer = (acc: Accessoire) => {
    setSelectedAccessoire(acc);
    setTransferSite(SITES.find(s => s !== acc.emplacement_actuel) || "");
    setTransferMotif("");
    setShowTransfer(true);
  };

  const filtered = accessoires.filter(a => {
    if (search && !a.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSite !== "all" && a.emplacement_actuel !== filterSite) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const getTypeLabel = (v: string) => ACCESSOIRE_TYPES.find(t => t.value === v)?.label || v;
  const getEtatInfo = (v: string) => ETATS.find(e => e.value === v) || ETATS[0];

  // Group by site for overview
  const bySite = SITES.map(site => ({
    site,
    count: accessoires.filter(a => a.emplacement_actuel === site).length,
  }));

  return (
    <DashboardLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader title="Accessoires" />
          <Button onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel accessoire
          </Button>
        </div>

        {/* Site overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bySite.map(({ site, count }) => (
            <Card key={site} className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setFilterSite(filterSite === site ? "all" : site)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{site.replace("_", " ")}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{accessoires.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list"><Baby className="h-4 w-4 mr-1.5" /> Liste</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> Historique transferts</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {ACCESSOIRE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSite} onValueChange={setFilterSite}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {SITES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Accessoire cards */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucun accessoire trouvé</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(acc => {
                  const etatInfo = getEtatInfo(acc.etat);
                  return (
                    <Card key={acc.id} className="group hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{acc.nom}</h3>
                            <p className="text-xs text-muted-foreground">{getTypeLabel(acc.type)}</p>
                          </div>
                          <Badge variant="outline" className={etatInfo.color}>
                            {etatInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{acc.emplacement_actuel.replace("_", " ")}</Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTransfer(acc)}>
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(acc)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin() && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(acc.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {acc.notes && <p className="text-xs text-muted-foreground truncate">{acc.notes}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {transferts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucun transfert enregistré</div>
            ) : (
              <div className="space-y-2">
                {transferts.map(t => {
                  const acc = accessoires.find(a => a.id === t.accessoire_id);
                  return (
                    <Card key={t.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{acc?.nom || "Accessoire supprimé"}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.site_depart.replace("_", " ")} → {t.site_arrivee.replace("_", " ")}
                            {t.motif && ` — ${t.motif}`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                          {format(new Date(t.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                        </span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel accessoire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={formNom} onChange={e => setFormNom(e.target.value)} placeholder="Ex: Siège bébé Maxi-Cosi" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              {showNewType ? (
                <div className="flex gap-2">
                  <Input
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="Nom du nouveau type"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => {
                    if (!newTypeLabel.trim()) return;
                    const value = newTypeLabel.trim().toLowerCase().replace(/\s+/g, "_");
                    setCustomTypes((prev) => [...prev, { value, label: newTypeLabel.trim() }]);
                    setFormType(value);
                    setNewTypeLabel("");
                    setShowNewType(false);
                  }}>OK</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowNewType(false); setNewTypeLabel(""); }}>✕</Button>
                </div>
              ) : (
                <Select value={formType} onValueChange={(v) => { if (v === "__new__") { setShowNewType(true); } else { setFormType(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                  <SelectContent>
                    {ACCESSOIRE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    {isAdmin() && (
                      <SelectItem value="__new__">
                        <span className="flex items-center gap-1 text-primary"><PlusCircle className="h-3 w-3" /> Créer un nouveau type</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>État</Label>
              <Select value={formEtat} onValueChange={setFormEtat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ETATS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={formSite} onValueChange={setFormSite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!formNom.trim() || !formType}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'accessoire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={formNom} onChange={e => setFormNom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              {showNewType ? (
                <div className="flex gap-2">
                  <Input
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="Nom du nouveau type"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => {
                    if (!newTypeLabel.trim()) return;
                    const value = newTypeLabel.trim().toLowerCase().replace(/\s+/g, "_");
                    setCustomTypes((prev) => [...prev, { value, label: newTypeLabel.trim() }]);
                    setFormType(value);
                    setNewTypeLabel("");
                    setShowNewType(false);
                  }}>OK</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowNewType(false); setNewTypeLabel(""); }}>✕</Button>
                </div>
              ) : (
                <Select value={formType} onValueChange={(v) => { if (v === "__new__") { setShowNewType(true); } else { setFormType(v); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESSOIRE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    {isAdmin() && (
                      <SelectItem value="__new__">
                        <span className="flex items-center gap-1 text-primary"><PlusCircle className="h-3 w-3" /> Créer un nouveau type</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>État</Label>
              <Select value={formEtat} onValueChange={setFormEtat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ETATS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={!formNom.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer — {selectedAccessoire?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Site actuel :</span>{" "}
                <span className="font-semibold">{selectedAccessoire?.emplacement_actuel.replace("_", " ")}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Destination *</Label>
              <Select value={transferSite} onValueChange={setTransferSite}>
                <SelectTrigger><SelectValue placeholder="Choisir le site" /></SelectTrigger>
                <SelectContent>
                  {SITES.filter(s => s !== selectedAccessoire?.emplacement_actuel).map(s => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input value={transferMotif} onChange={e => setTransferMotif(e.target.value)} placeholder="Ex: Location client Dupont" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>Annuler</Button>
            <Button onClick={handleTransfer} disabled={!transferSite}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
