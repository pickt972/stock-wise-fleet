import { supabase } from "@/integrations/supabase/client";

export interface AggregatedGroup {
  key: string;
  sousCategorie: string;
  /** @deprecated — toujours null désormais, les véhicules sont dans vehiculeIds */
  vehiculeId: string | null;
  /** @deprecated */
  vehiculeLabel: string | null;
  /** Liste de tous les véhicules compatibles avec au moins un article du groupe */
  vehiculeIds: string[];
  vehiculeLabels: string[];
  totalStock: number;
  stockMin: number;
  articleIds: string[];
  articles: Array<{
    id: string;
    designation: string;
    reference: string;
    marque: string;
    stock: number;
    stock_min: number;
    prix_achat: number;
    categorie: string;
    sous_categorie: string | null;
    /** Véhicules compatibles avec cet article précis */
    vehiculeIds: string[];
    vehiculeLabels: string[];
  }>;
}

interface FetchAggregatedOptions {
  onlyAlerts?: boolean;
}

export async function fetchAggregatedStockGroups(
  options: FetchAggregatedOptions = {}
): Promise<AggregatedGroup[]> {

  // 1. Tous les articles actifs
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("id, designation, reference, marque, stock, stock_min, prix_achat, categorie, sous_categorie")
    .is("archived_at", null);
  if (artErr) throw artErr;
  if (!articles || articles.length === 0) return [];

  const articleIds = articles.map((a: any) => a.id);

  // 2. Compatibilités véhicules
  const { data: compat, error: compatErr } = await supabase
    .from("article_vehicules")
    .select("article_id, vehicule_id")
    .in("article_id", articleIds);
  if (compatErr) throw compatErr;

  // 3. Labels véhicules
  const vehiculeIds = Array.from(new Set((compat || []).map((c: any) => c.vehicule_id)));
  let vehiculesMap: Record<string, string> = {};
  if (vehiculeIds.length > 0) {
    const { data: vehs } = await supabase
      .from("vehicules")
      .select("id, marque, modele, immatriculation")
      .in("id", vehiculeIds);
    (vehs || []).forEach((v: any) => {
      vehiculesMap[v.id] = `${v.marque} ${v.modele}${v.immatriculation ? ` (${v.immatriculation})` : ""}`;
    });
  }

  // 4. Seuils configurés
  const { data: thresholds } = await supabase
    .from("subcategory_stock_thresholds")
    .select("sous_categorie, vehicule_id, stock_min");
  const thresholdMap: Record<string, number> = {};
  (thresholds || []).forEach((t: any) => {
    // On ne garde que les seuils globaux (vehicule_id null) — les seuils par véhicule
    // n'ont plus de sens maintenant que le stock est mutualisé
    const k = `${t.sous_categorie}::null`;
    if (thresholdMap[k] === undefined || t.vehicule_id === null) {
      thresholdMap[k] = t.stock_min;
    }
  });

  // 5. Index article → véhicules compatibles
  const articleToVehicules: Record<string, string[]> = {};
  (compat || []).forEach((c: any) => {
    if (!articleToVehicules[c.article_id]) articleToVehicules[c.article_id] = [];
    articleToVehicules[c.article_id].push(c.vehicule_id);
  });

  // 6. Grouper par sous_categorie UNIQUEMENT (plus de split par véhicule)
  //    → une batterie 60Ah compatible Sandero + Fiesta = 1 seul groupe
  //      avec le stock total et les deux véhicules listés
  const groups: Record<string, AggregatedGroup> = {};

  for (const a of articles as any[]) {
    const groupLabel = (a.sous_categorie && a.sous_categorie.trim() !== "")
      ? a.sous_categorie.trim()
      : (a.categorie || "Sans catégorie");

    const key = groupLabel; // clé unique = sous_categorie seulement

    if (!groups[key]) {
      groups[key] = {
        key,
        sousCategorie: groupLabel,
        vehiculeId: null,   // déprécié, conservé pour compatibilité
        vehiculeLabel: null,
        vehiculeIds: [],
        vehiculeLabels: [],
        totalStock: 0,
        stockMin: 0,
        articleIds: [],
        articles: [],
      };
    }

    const artVehIds = articleToVehicules[a.id] || [];
    const artVehLabels = artVehIds.map((id) => vehiculesMap[id] || id);

    // Ajouter les véhicules compatibles au groupe (sans doublons)
    for (const vid of artVehIds) {
      if (!groups[key].vehiculeIds.includes(vid)) {
        groups[key].vehiculeIds.push(vid);
        groups[key].vehiculeLabels.push(vehiculesMap[vid] || vid);
      }
    }

    groups[key].totalStock += a.stock || 0;
    groups[key].articleIds.push(a.id);
    groups[key].articles.push({
      ...a,
      vehiculeIds: artVehIds,
      vehiculeLabels: artVehLabels,
    });
  }

  // 7. StockMin par groupe (seuil global de la sous-catégorie)
  for (const g of Object.values(groups)) {
    const globalKey = `${g.sousCategorie}::null`;
    if (thresholdMap[globalKey] !== undefined) {
      g.stockMin = thresholdMap[globalKey];
    } else {
      // Fallback : somme des stock_min individuels (sans doublons)
      const seen = new Set<string>();
      g.stockMin = g.articles.reduce((sum, a) => {
        if (seen.has(a.id)) return sum;
        seen.add(a.id);
        return sum + (a.stock_min || 0);
      }, 0);
    }
  }

  let result = Object.values(groups);

  if (options.onlyAlerts) {
    result = result.filter((g) => {
      const hasRupture = g.articles.some((a) => a.stock === 0);
      const hasFaible  = g.stockMin > 0 && g.totalStock < g.stockMin;
      return hasRupture || hasFaible;
    });
  }

  return result.sort((a, b) => {
    const aRupture = a.articles.some((x) => x.stock === 0) ? 1 : 0;
    const bRupture = b.articles.some((x) => x.stock === 0) ? 1 : 0;
    if (bRupture !== aRupture) return bRupture - aRupture;
    return (b.stockMin - b.totalStock) - (a.stockMin - a.totalStock);
  });
}
