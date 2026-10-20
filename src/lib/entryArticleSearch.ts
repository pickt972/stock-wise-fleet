export interface EntrySearchArticle {
  reference: string;
  designation: string;
  categorie: string;
  sous_categorie: string | null;
  marque: string | null;
  code_barre: string | null;
  stock: number;
  stock_min: number;
}

export interface EntryArticleFilters { category: string; subcategory: string; brand: string }

export function filterEntryArticles<T extends EntrySearchArticle>(articles: T[], filters: EntryArticleFilters, search = "", scannedCode: string | null = null): T[] {
  const q = search.trim().toLocaleLowerCase("fr");
  return articles.filter((a) => {
    if (scannedCode) return a.reference === scannedCode || a.code_barre === scannedCode;
    return (!filters.category || a.categorie === filters.category)
      && (!filters.subcategory || (a.sous_categorie?.trim() || "") === filters.subcategory)
      && (!filters.brand || (a.marque?.trim() || "") === filters.brand)
      && (!q || [a.reference, a.designation, a.categorie, a.sous_categorie, a.marque, a.code_barre]
        .some((value) => value?.toLocaleLowerCase("fr").includes(q)));
  });
}

export function entryFilterOptions(articles: EntrySearchArticle[], category: string, subcategory: string) {
  const unique = (values: (string | null)[]) => [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, "fr"));
  const inCategory = articles.filter((a) => !category || a.categorie === category);
  const inSubcategory = inCategory.filter((a) => !subcategory || a.sous_categorie?.trim() === subcategory);
  return { categories: unique(articles.map((a) => a.categorie)), subcategories: unique(inCategory.map((a) => a.sous_categorie)), brands: unique(inSubcategory.map((a) => a.marque)) };
}

export function entryStockStatus(stock: number, minimum: number): "ok" | "low" | "empty" {
  if (stock <= 0) return "empty";
  return minimum > 0 && stock <= minimum ? "low" : "ok";
}