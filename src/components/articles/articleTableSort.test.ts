import { describe, expect, test } from "bun:test";
import { nextArticleSort, sortArticles, type ArticleSortColumn } from "./articleTableSort";

const articles = [
  { reference: "Z10", designation: "Zinc", categorie: "Filtres", sous_categorie: "Huile", marque: "VALEO", stock: 12, prix_achat: 24 },
  { reference: "A2", designation: "Ampoule", categorie: "Batteries", sous_categorie: null, marque: "BOSCH", stock: 2, prix_achat: 3.5 },
];

describe("Article table sorting", () => {
  const columns: ArticleSortColumn[] = ["stock", "reference", "designation", "categorie", "marque", "prix_achat"];
  for (const column of columns) {
    test(`${column}: ascending, descending, then original order on the third click`, () => {
      const ascending = nextArticleSort(null, column);
      expect(sortArticles(articles, ascending).map(a => a.reference)).toEqual(["A2", "Z10"]);
      const descending = nextArticleSort(ascending, column);
      expect(sortArticles(articles, descending).map(a => a.reference)).toEqual(["Z10", "A2"]);
      const reset = nextArticleSort(descending, column);
      expect(reset).toBeNull();
      expect(sortArticles(articles, reset)).toEqual(articles);
    });
  }
  test("changing columns starts ascending and sorting preserves a filtered subset", () => {
    expect(nextArticleSort({ column: "stock", direction: "desc" }, "reference")).toEqual({ column: "reference", direction: "asc" });
    expect(sortArticles(articles.filter(a => a.stock < 5), { column: "stock", direction: "asc" })).toEqual([articles[1]]);
    expect(articles[0].reference).toBe("Z10");
  });
});