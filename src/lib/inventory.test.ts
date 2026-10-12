import { describe, expect, test } from "bun:test";
import { variance, varianceTone, sortForCounting, countingProgress, itemsWithVariance, formatDuration } from "./inventory";

describe("inventaire", () => {
  test("écart = comptée - théorique", () => {
    expect(variance(10, 7)).toBe(-3);
    expect(variance(10, 12)).toBe(2);
    expect(variance(10, null)).toBeNull();
  });
  test("couleur : rouge si négatif, vert si positif, gris si zéro", () => {
    expect(varianceTone(-1)).toBe("negative");
    expect(varianceTone(3)).toBe("positive");
    expect(varianceTone(0)).toBe("neutral");
  });
  test("non comptés en haut, comptés en bas", () => {
    const sorted = sortForCounting([
      { id: "a", reference: "A", stock_theorique: 1, stock_compte: 1 },
      { id: "b", reference: "B", stock_theorique: 1, stock_compte: null },
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["b", "a"]);
  });
  test("progression X comptés / Y total", () => {
    expect(countingProgress([
      { id: "a", stock_theorique: 1, stock_compte: 0 },
      { id: "b", stock_theorique: 1, stock_compte: null },
    ])).toEqual({ total: 2, counted: 1, percent: 50 });
  });
  test("le détail ne garde que les écarts non nuls", () => {
    const r = itemsWithVariance([
      { id: "a", stock_theorique: 2, stock_compte: 2 },
      { id: "b", stock_theorique: 2, stock_compte: 1 },
      { id: "c", stock_theorique: 2, stock_compte: null },
    ]);
    expect(r.map((i) => i.id)).toEqual(["b"]);
  });
  test("durée", () => {
    expect(formatDuration("2026-10-10T14:00:00Z", "2026-10-11T09:00:00Z")).toBe("19 h 00");
  });
});
