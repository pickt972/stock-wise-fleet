// Règle métier : un véhicule est obligatoire à la sortie si l'article le demande
// (articles.vehicule_required) OU si sa catégorie / sous-catégorie (ou un parent)
// a requires_vehicle = true dans les réglages.

export interface VehicleCategoryNode {
  id: string;
  nom: string;
  parent_id: string | null;
  requires_vehicle: boolean | null;
}

export interface VehicleArticleLike {
  vehicule_required?: boolean | null;
  categorie?: string | null;
  sous_categorie?: string | null;
}

export function categoryRequiresVehicle(
  article: VehicleArticleLike | null | undefined,
  cats: VehicleCategoryNode[]
): boolean {
  if (!article) return false;
  const byName = (n?: string | null) =>
    n ? cats.find((c) => c.nom.trim().toLowerCase() === n.trim().toLowerCase()) : undefined;
  // Sous-catégorie : surcharge si non null, sinon on remonte les parents
  let node = byName(article.sous_categorie) ?? byName(article.categorie);
  let guard = 0;
  while (node && guard++ < 10) {
    if (node.requires_vehicle === true) return true;
    if (node.requires_vehicle === false && node.parent_id) return false;
    const parentId = node.parent_id;
    node = parentId ? cats.find((c) => c.id === parentId) : undefined;
  }
  return !!byName(article.categorie)?.requires_vehicle;
}

export function needsVehicleForExit(
  article: VehicleArticleLike | null | undefined,
  cats: VehicleCategoryNode[]
): boolean {
  return !!article?.vehicule_required || categoryRequiresVehicle(article, cats);
}

export function exitVehicleValid(required: boolean, fleetId: string, brand: string, model: string): boolean {
  return !required || Boolean(fleetId || (brand.trim() && model.trim()));
}
