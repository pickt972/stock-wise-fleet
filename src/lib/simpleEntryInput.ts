export function parseSimpleEntryPrice(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;
  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) throw new Error("Prix unitaire invalide");
  return price;
}