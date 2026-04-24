import { supabase } from "@/integrations/supabase/client";

/**
 * Représente un groupe agrégé : toutes les marques d'une même sous-catégorie
 * compatibles avec un même véhicule.
 * Si vehiculeId est null, le groupe ne dépend pas d'un véhicule spécifique
 * (sous-catégorie sans aucune compatibilité véhicule renseignée).
 */
export interface AggregatedGroup {
  key: string; // "sous_categorie::vehicule_id"
  sousCategorie: string;
  vehiculeId: string | null;
  vehiculeLabel: string | null;
  totalStock: number;
  stockMin: number; // seuil agrégé (depuis subcategory_stock_thresholds, fallback = somme des stock_min)
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
  /** N'inclure que les groupes en alerte (stock total <= stockMin) */
  onlyAlerts?: boolean;
}

/**
 * Construit l'agrégation : pour chaque (sous-catégorie, véhicule compatible)
 * on additionne les stocks de toutes les marques d'articles de cette
 * sous-catégorie compatibles avec ce véhicule.
 *
 * Le seuil min utilisé est :
 *   1. Si un seuil existe dans subcategory_stock_thresholds pour
 *      (sous_categorie, vehicule_id) → on utilise ce seuil.
 *   2. Sinon si un seuil "global" existe (vehicule_id NULL) pour la
 *      sous-catégorie → on l'utilise.
 *   3. Sinon fallback : somme des stock_min des articles du groupe.
 */
export async function fetchAggregatedStockGroups(
  options: FetchAggregatedOptions = {}
): Promise<AggregatedGroup[]> {
  // 1. Charger tous les articles ayant une sous-catégorie
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select(
      "id, designation, reference, marque, stock, stock_min, prix_achat, categorie, sous_categorie"
    );
  if (artErr) throw artErr;

  const articlesWithSubcat = (articles || []).filter(
    (a: any) => a.sous_categorie && a.sous_categorie.trim() !== ""
  );
  if (articlesWithSubcat.length === 0) return [];

  const articleIds = articlesWithSubcat.map((a: any) => a.id);

  // 2. Charger les compatibilités véhicules
  const { data: compat, error: compatErr } = await supabase
    .from("article_vehicules")
    .select("article_id, vehicule_id")
    .in("article_id", articleIds);
  if (compatErr) throw compatErr;

  const vehiculeIds = Array.from(
    new Set((compat || []).map((c: any) => c.vehicule_id))
  );

  // 3. Charger les véhicules pour obtenir leur libellé
  let vehiculesMap: Record<string, string> = {};
  if (vehiculeIds.length > 0) {
    const { data: vehs } = await supabase
      .from("vehicules")
      .select("id, marque, modele, immatriculation")
      .in("id", vehiculeIds);
    (vehs || []).forEach((v: any) => {
      vehiculesMap[v.id] = `${v.marque} ${v.modele}${
        v.immatriculation ? ` (${v.immatriculation})` : ""
      }`;
    });
  }

  // 4. Charger les seuils configurés
  const { data: thresholds } = await supabase
    .from("subcategory_stock_thresholds")
    .select("sous_categorie, vehicule_id, stock_min");
  const thresholdMap: Record<string, number> = {};
  (thresholds || []).forEach((t: any) => {
    const k = `${t.sous_categorie}::${t.vehicule_id ?? "null"}`;
    thresholdMap[k] = t.stock_min;
  });

  // 5. Construire l'index article -> véhicules compatibles
  const articleToVehicules: Record<string, string[]> = {};
  (compat || []).forEach((c: any) => {
    if (!articleToVehicules[c.article_id]) articleToVehicules[c.article_id] = [];
    articleToVehicules[c.article_id].push(c.vehicule_id);
  });

  // 6. Grouper par (sous_categorie, vehicule_id)
  const groups: Record<string, AggregatedGroup> = {};
  for (const a of articlesWithSubcat) {
    const compatVehs = articleToVehicules[a.id] || [];
    const targets: Array<string | null> =
      compatVehs.length > 0 ? compatVehs : [null];
    for (const vehId of targets) {
      const key = `${a.sous_categorie}::${vehId ?? "null"}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          sousCategorie: a.sous_categorie!,
          vehiculeId: vehId,
          vehiculeLabel: vehId ? vehiculesMap[vehId] || null : null,
          totalStock: 0,
          stockMin: 0,
          articleIds: [],
          articles: [],
        };
      }
      groups[key].totalStock += a.stock || 0;
      groups[key].articleIds.push(a.id);
      groups[key].articles.push(a as any);
    }
  }

  // 7. Calculer le stockMin de chaque groupe
  for (const g of Object.values(groups)) {
    const specificKey = `${g.sousCategorie}::${g.vehiculeId ?? "null"}`;
    const globalKey = `${g.sousCategorie}::null`;
    if (thresholdMap[specificKey] !== undefined) {
      g.stockMin = thresholdMap[specificKey];
    } else if (thresholdMap[globalKey] !== undefined) {
      g.stockMin = thresholdMap[globalKey];
    } else {
      // Fallback : somme des stock_min des articles uniques du groupe
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
    result = result.filter((g) => g.totalStock <= g.stockMin);
  }
  return result.sort((a, b) => {
    const da = a.stockMin - a.totalStock;
    const db = b.stockMin - b.totalStock;
    return db - da;
  });
}
