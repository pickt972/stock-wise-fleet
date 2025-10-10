import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, ShoppingCart, Truck, FileText, MapPin } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  type: "article" | "commande" | "fournisseur" | "vehicule" | "emplacement";
  id: string;
  title: string;
  subtitle?: string;
  route: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Raccourci clavier Ctrl+K ou Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Recherche en temps réel
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchData = async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        const results: SearchResult[] = [];

        // Rechercher dans les articles
        const { data: articles } = await supabase
          .from("articles")
          .select("id, reference, designation, marque")
          .or(`reference.ilike.${searchTerm},designation.ilike.${searchTerm},marque.ilike.${searchTerm}`)
          .limit(5);

        if (articles) {
          results.push(
            ...articles.map((a) => ({
              type: "article" as const,
              id: a.id,
              title: a.designation,
              subtitle: `${a.reference} - ${a.marque}`,
              route: `/articles?search=${a.reference}`,
            }))
          );
        }

        // Rechercher dans les commandes
        const { data: commandes } = await supabase
          .from("commandes")
          .select("id, numero_commande, fournisseur")
          .or(`numero_commande.ilike.${searchTerm},fournisseur.ilike.${searchTerm}`)
          .limit(5);

        if (commandes) {
          results.push(
            ...commandes.map((c) => ({
              type: "commande" as const,
              id: c.id,
              title: c.numero_commande,
              subtitle: c.fournisseur,
              route: `/commandes?search=${c.numero_commande}`,
            }))
          );
        }

        // Rechercher dans les fournisseurs
        const { data: fournisseurs } = await supabase
          .from("fournisseurs")
          .select("id, nom, email")
          .ilike("nom", searchTerm)
          .limit(5);

        if (fournisseurs) {
          results.push(
            ...fournisseurs.map((f) => ({
              type: "fournisseur" as const,
              id: f.id,
              title: f.nom,
              subtitle: f.email,
              route: `/fournisseurs?search=${f.nom}`,
            }))
          );
        }

        // Rechercher dans les véhicules
        const { data: vehicules } = await supabase
          .from("vehicules")
          .select("id, marque, modele, immatriculation")
          .or(`marque.ilike.${searchTerm},modele.ilike.${searchTerm},immatriculation.ilike.${searchTerm}`)
          .limit(5);

        if (vehicules) {
          results.push(
            ...vehicules.map((v) => ({
              type: "vehicule" as const,
              id: v.id,
              title: `${v.marque} ${v.modele}`,
              subtitle: v.immatriculation,
              route: `/vehicules?search=${v.immatriculation}`,
            }))
          );
        }

        // Rechercher dans les emplacements
        const { data: emplacements } = await supabase
          .from("emplacements")
          .select("id, nom, description")
          .ilike("nom", searchTerm)
          .limit(5);

        if (emplacements) {
          results.push(
            ...emplacements.map((e) => ({
              type: "emplacement" as const,
              id: e.id,
              title: e.nom,
              subtitle: e.description,
              route: `/emplacements?search=${e.nom}`,
            }))
          );
        }

        setResults(results);
      } catch (error) {
        console.error("Erreur de recherche:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'effectuer la recherche",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query, toast]);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "article":
        return <Package className="h-4 w-4" />;
      case "commande":
        return <ShoppingCart className="h-4 w-4" />;
      case "fournisseur":
        return <Truck className="h-4 w-4" />;
      case "vehicule":
        return <FileText className="h-4 w-4" />;
      case "emplacement":
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "article":
        return "Articles";
      case "commande":
        return "Commandes";
      case "fournisseur":
        return "Fournisseurs";
      case "vehicule":
        return "Véhicules";
      case "emplacement":
        return "Emplacements";
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    setOpen(false);
    setQuery("");
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md hover:bg-muted transition-colors w-full max-w-md"
      >
        <Search className="h-4 w-4" />
        <span>Rechercher...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher des articles, commandes, fournisseurs..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          )}
          
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          )}

          {Object.entries(groupedResults).map(([type, items]) => (
            <CommandGroup key={type} heading={getLabel(type as SearchResult["type"])}>
              {items.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {getIcon(result.type)}
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
