/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { parseSimpleEntryPrice, quickEntryArticle } from "./simpleEntryInput";

test("entrée simple : le prix optionnel vide vaut zéro", () => {
  expect(parseSimpleEntryPrice(" ")).toBe(0);
});

test("entrée simple : conserve le prix unitaire saisi avec une virgule", () => {
  expect(parseSimpleEntryPrice("12,50")).toBe(12.5);
  expect(parseSimpleEntryPrice("12.50")).toBe(12.5);
});

test("entrée simple : un prix invalide n’est pas silencieusement remplacé par zéro", () => {
  expect(() => parseSimpleEntryPrice("abc")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("12abc")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("-1")).toThrow("Prix unitaire invalide");
  expect(() => parseSimpleEntryPrice("Infinity")).toThrow("Prix unitaire invalide");
});

const article = { reference: " REF-123 ", designation: " Filtre ", categorie: "Filtres", sous_categorie: "Huile", price: "12,50" };
test("création rapide : fiche non brouillon et stock initial zéro avant ajout par l’entrée", () => {
  expect(quickEntryArticle(article).is_draft).toBe(false);
  expect(quickEntryArticle(article).stock).toBe(0);
  expect(quickEntryArticle(article).reference).toBe("REF-123");
});
test("complétion rapide : conserve la fiche et utilise la référence définitive", () => {
  const result = quickEntryArticle({ ...article, id: "existing-draft" });
  expect(result.id).toBe("existing-draft");
  expect(result.reference).toBe("REF-123");
  expect(result.is_draft).toBe(false);
});
test("création rapide : les champs essentiels et la référence définitive sont requis", () => {
  expect(() => quickEntryArticle({ ...article, reference: "DRAFT-20261019-001" })).toThrow();
  expect(() => quickEntryArticle({ ...article, designation: " " })).toThrow();
  expect(() => quickEntryArticle({ ...article, categorie: "" })).toThrow();
});
test("création rapide : conserve la marque et ne compte pas la quantité avant validation de l’entrée", () => {
  const result = quickEntryArticle({ ...article, marque: " VARTA " });
  expect(result.marque).toBe("VARTA");
  expect(result.stock).toBe(0);
  expect(result.is_draft).toBe(false);
});