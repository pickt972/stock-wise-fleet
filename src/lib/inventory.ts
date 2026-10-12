export type InventoryStatus = "en_cours" | "cloture" | "valide" | "abandonne";

export type CountItem = {
  id: string;
  stock_theorique: number;
  stock_compte: number | null;
  reference?: string;
};

/** Écart = comptée − théorique ; null tant que l'article n'est pas compté. */
export function variance(theoretical: number, counted: number | null): number | null {
  return counted === null || counted === undefined ? null : counted - theoretical;
}

export type VarianceTone = "negative" | "positive" | "neutral" | "none";
export function varianceTone(v: number | null): VarianceTone {
  if (v === null) return "none";
  if (v < 0) return "negative";
  if (v > 0) return "positive";
  return "neutral";
}

/** Articles non comptés d'abord, puis comptés ; ordre par référence à l'intérieur. */
export function sortForCounting<T extends CountItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ca = a.stock_compte === null ? 0 : 1;
    const cb = b.stock_compte === null ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return (a.reference ?? "").localeCompare(b.reference ?? "");
  });
}

export function countingProgress(items: CountItem[]) {
  const total = items.length;
  const counted = items.filter((i) => i.stock_compte !== null).length;
  return { total, counted, percent: total === 0 ? 0 : Math.round((counted / total) * 100) };
}

export function itemsWithVariance<T extends CountItem>(items: T[]): T[] {
  return items.filter((i) => {
    const v = variance(i.stock_theorique, i.stock_compte);
    return v !== null && v !== 0;
  });
}

export function statusLabel(s: string): { label: string; emoji: string } {
  switch (s) {
    case "en_cours": return { label: "En cours", emoji: "🟡" };
    case "abandonne": return { label: "Abandonné", emoji: "🔴" };
    default: return { label: "Clôturé", emoji: "🟢" };
  }
}

/** Durée lisible entre deux dates (ex. « 2 h 05 », « 3 j 4 h »). */
export function formatDuration(from: string | Date, to: string | Date): string {
  const ms = Math.max(0, new Date(to).getTime() - new Date(from).getTime());
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  return `${m} min`;
}
