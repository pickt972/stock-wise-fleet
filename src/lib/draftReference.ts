export function draftDatePrefix(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `DRAFT-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-`;
}

/** Next DRAFT-AAAAMMJJ-XXX given references already used today. */
export function nextDraftReference(existing: string[], d: Date = new Date()): string {
  const prefix = draftDatePrefix(d);
  const max = existing
    .filter((r) => r?.startsWith(prefix))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export const isDraftReference = (r?: string | null) => !!r && /^(DRAFT-|A-COMPLETER-)/.test(r);

/** A fiche is complete when reference (non provisional), marque, catégorie and code-barres are set. */
export function isArticleComplete(a: { reference?: string | null; marque?: string | null; categorie?: string | null; code_barre?: string | null }): boolean {
  return !!a.reference?.trim() && !isDraftReference(a.reference) && !!a.marque?.trim()
    && !!a.categorie?.trim() && a.categorie !== "À classer" && !!a.code_barre?.trim();
}
