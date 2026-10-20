/** Empty → null; comma decimals accepted; negative or non-numeric → NaN. */
export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lieu affiché d'un inventaire : nom du périmètre, sinon « Inventaire complet ». Jamais un UUID brut. */
export function inventoryPlaceLabel(scopeType: string, scopeName: string | undefined): string {
  if (scopeType === "all" || !scopeName || UUID.test(scopeName.trim())) return "Inventaire complet";
  return scopeName;
}

export const isUuidLike = (s: string | null | undefined) => !!s && UUID.test(s.trim());
