/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { entryFilterOptions, entryStockStatus, filterEntryArticles } from "./entryArticleSearch";

const articles = [
  { reference: "BAT-60", designation: "Batterie 60Ah", categorie: "Batteries", sous_categorie: "60Ah", marque: "VARTA", code_barre: "123", stock: 5, stock_min: 2 },
  { reference: "BAT-70", designation: "Batterie 70Ah", categorie: "Batteries", sous_categorie: "70Ah", marque: "BOSCH", code_barre: null, stock: 1, stock_min: 2 },
  { reference: "FIL-01", designation: "Filtre huile", categorie: "Filtres", sous_categorie: "Huile", marque: "MANN", code_barre: null, stock: 0, stock_min: 0 },
];
test("les sous-catégories se limitent à Batteries", () => {
  expect(entryFilterOptions(articles, "Batteries", "").subcategories).toEqual(["60Ah", "70Ah"]);
});
test("les marques se limitent à la sous-catégorie 60Ah", () => {
  expect(entryFilterOptions(articles, "Batteries", "60Ah").brands).toEqual(["VARTA"]);
});
test("les trois filtres se combinent avec la recherche libre", () => {
  expect(filterEntryArticles(articles, { category: "Batteries", subcategory: "60Ah", brand: "VARTA" }, "bat-60").map((a) => a.reference)).toEqual(["BAT-60"]);
  expect(filterEntryArticles(articles, { category: "Batteries", subcategory: "60Ah", brand: "VARTA" }, "huile")).toEqual([]);
});
test("recherche directe par nom sans filtre et scan exact même avec d’anciens filtres", () => {
  expect(filterEntryArticles(articles, { category: "", subcategory: "", brand: "" }, "filtre huile")[0]?.reference).toBe("FIL-01");
  expect(filterEntryArticles(articles, { category: "Filtres", subcategory: "Huile", brand: "MANN" }, "123", "123")[0]?.reference).toBe("BAT-60");
});
test("stock OK positif au-dessus du seuil, bas au seuil et rupture à zéro", () => {
  expect(entryStockStatus(5, 2)).toBe("ok");
  expect(entryStockStatus(1, 2)).toBe("low");
  expect(entryStockStatus(2, 2)).toBe("low");
  expect(entryStockStatus(0, 0)).toBe("empty");
  expect(entryStockStatus(1, 0)).toBe("ok");
});