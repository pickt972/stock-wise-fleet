export function validateReceptionQuantity(quantity: number, remaining: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantité reçue minimum : 1 (nombre entier)");
  if (quantity > remaining) throw new Error("Quantité reçue invalide : vérifiez le reste à recevoir");
}

export function validateEntryItems(items: { article_id: string; quantity: number; unit_price: number }[]) {
  if (items.length === 0) throw new Error("Ajoutez au moins un article");
  for (const item of items) {
    if (!item.article_id) throw new Error("Choisissez un article");
    validateReceptionQuantity(item.quantity, Number.MAX_SAFE_INTEGER);
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) throw new Error("Prix unitaire invalide");
  }
}