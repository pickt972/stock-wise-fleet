/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { nextDraftReference, isArticleComplete } from "./draftReference";

const d = new Date(2026, 9, 12);

test("première référence du jour = DRAFT-20261012-001", () => {
  expect(nextDraftReference([], d)).toBe("DRAFT-20261012-001");
});

test("incrémente après la plus haute du jour", () => {
  expect(nextDraftReference(["DRAFT-20261012-001", "DRAFT-20261012-007", "DRAFT-20261011-020"], d)).toBe("DRAFT-20261012-008");
});

test("fiche complète seulement avec référence, marque, catégorie et code-barres", () => {
  const ok = { reference: "F123", marque: "BOSCH", categorie: "Filtres", code_barre: "123" };
  expect(isArticleComplete(ok)).toBe(true);
  expect(isArticleComplete({ ...ok, code_barre: "" })).toBe(false);
  expect(isArticleComplete({ ...ok, reference: "DRAFT-20261012-001" })).toBe(false);
});
