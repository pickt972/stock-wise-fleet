export type ArticleSortColumn = "stock" | "reference" | "designation" | "categorie" | "marque" | "prix_achat";
export type ArticleSort = { column: ArticleSortColumn; direction: "asc" | "desc" } | null;

export function nextArticleSort(current: ArticleSort, column: ArticleSortColumn): ArticleSort {
  if (current?.column !== column) return { column, direction: "asc" };
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

type SortableArticle = {
  stock: number;
  reference: string;
  designation: string;
  categorie: string;
  sous_categorie?: string | null;
  marque: string;
  prix_achat: number;
};

export function sortArticles<T extends SortableArticle>(articles: readonly T[], sort: ArticleSort): T[] {
  if (!sort) return [...articles];
  const { column, direction } = sort;
  const sign = direction === "asc" ? 1 : -1;
  return [...articles].sort((a, b) => {
    if (column === "stock" || column === "prix_achat") return sign * (a[column] - b[column]);
    const comparison = (a[column] || "").localeCompare(b[column] || "", "fr", { numeric: true, sensitivity: "base" });
    if (column === "categorie" && comparison === 0) {
      return sign * (a.sous_categorie || "").localeCompare(b.sous_categorie || "", "fr", { numeric: true, sensitivity: "base" });
    }
    return sign * comparison;
  });
}