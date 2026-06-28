import { supabase } from "@/integrations/supabase/client";

export interface AggregatedGroup {
  key: string;
  sousCategorie: string;
  vehiculeId: string | null;
  vehiculeLabel: string | null;
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
  }>;
}

interface FetchAggregatedOptions {
  onlyAlerts?: boolean;
}

export async function fetchAggregatedStockGroups(
  options: FetchAggregatedOptions = {}
): Promise<AggregatedGroup[]> {

  // 1. Tous les articles actifs (avec ou sans sous_categorie)
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
    const k = `${t.sous_categorie}::${t.vehicule_id ?? "null"}`;
    thresholdMap[k] = t.stock_min;
  });

  // 5. Index article → véhicules
  const articleToVehicules: Record<string, string[]> = {};
  (compat || []).forEach((c: any) => {
    if (!articleToVehicules[c.article_id]) articleToVehicules[c.article_id] = [];
    articleToVehicules[c.article_id].push(c.vehicule_id);
  });

  // 6. Grouper par (sous_categorie_normalisée, vehicule_id)
  // Articles sans sous_categorie → regroupés sous leur catégorie principale
  const groups: Record<string, AggregatedGroup> = {};

  for (const a of articles as any[]) {
    // Utiliser sous_categorie si dispo, sinon fallback sur categorie
    const groupLabel = (a.sous_categorie && a.sous_categorie.trim() !== "")
      ? a.sous_categorie.trim()
      : (a.categorie || "Sans catégorie");

    const compatVehs = articleToVehicules[a.id] || [];
    const targets: Array<string | null> = compatVehs.length > 0 ? compatVehs : [null];

    for (const vehId of targets) {
      const key = `${groupLabel}::${vehId ?? "null"}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          sousCategorie: groupLabel,
          vehiculeId: vehId,
          vehiculeLabel: vehId ? (vehiculesMap[vehId] || null) : null,
          totalStock: 0,
          stockMin: 0,
          articleIds: [],
          articles: [],
        };
      }
      groups[key].totalStock += a.stock || 0;
      groups[key].articleIds.push(a.id);
      groups[key].articles.push(a);
    }
  }

  // 7. StockMin par groupe
  for (const g of Object.values(groups)) {
    const specificKey = `${g.sousCategorie}::${g.vehiculeId ?? "null"}`;
    const globalKey = `${g.sousCategorie}::null`;
    if (thresholdMap[specificKey] !== undefined) {
      g.stockMin = thresholdMap[specificKey];
    } else if (thresholdMap[globalKey] !== undefined) {
      g.stockMin = thresholdMap[globalKey];
    } else {
      // Fallback : somme des stock_min individuels (dédupliqués)
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
      // Alerte si : au moins un article en rupture (stock=0)
      // OU stock total sous le seuil minimum (avec seuil > 0)
      const hasRupture = g.articles.some((a) => a.stock === 0);
      const hasFaible = g.stockMin > 0 && g.totalStock < g.stockMin;
      return hasRupture || hasFaible;
    });
  }

  return result.sort((a, b) => {
    // Trier : ruptures en premier, puis déficit décroissant
    const aHasRupture = a.articles.some((x) => x.stock === 0) ? 1 : 0;
    const bHasRupture = b.articles.some((x) => x.stock === 0) ? 1 : 0;
    if (bHasRupture !== aHasRupture) return bHasRupture - aHasRupture;
    const da = a.stockMin - a.totalStock;
    const db = b.stockMin - b.totalStock;
    return db - da;
  });
}
