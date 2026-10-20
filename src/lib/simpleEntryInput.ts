export function parseSimpleEntryPrice(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;
  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) throw new Error("Prix unitaire invalide");
  return price;
}

export function quickEntryArticle(input: { id?: string; reference: string; designation: string; categorie: string; sous_categorie: string; marque?: string; code_barre?: string | null; price: string }) {
  const reference = input.reference.trim();
  if (!reference || /^(DRAFT-|A-COMPLETER-)/i.test(reference)) throw new Error("Renseignez une référence définitive");
  if (!input.designation.trim()) throw new Error("Le nom de l’article est obligatoire");
  if (!input.categorie.trim() || input.categorie === "À classer") throw new Error("La catégorie est obligatoire");
  return { id: input.id, reference, designation: input.designation.trim(), categorie: input.categorie.trim(),
    marque: input.marque?.trim() || "",
    sous_categorie: input.sous_categorie.trim() || null, code_barre: input.code_barre || null,
    prix_achat: parseSimpleEntryPrice(input.price), is_draft: false, stock: 0 };
}