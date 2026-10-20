import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { ArticleSort, ArticleSortColumn } from "./articleTableSort";

interface TableArticle {
  id: string;
  stock: number;
  stock_min: number;
  reference: string;
  designation: string;
  categorie: string;
  sous_categorie?: string | null;
  marque: string;
  prix_achat: number;
  emplacement: string;
  is_draft?: boolean;
}

const columns: { key: ArticleSortColumn; label: string }[] = [
  { key: "stock", label: "Quantité" },
  { key: "reference", label: "Référence" },
  { key: "designation", label: "Nom" },
  { key: "categorie", label: "Catégorie / Sous-catégorie" },
  { key: "marque", label: "Marque" },
  { key: "prix_achat", label: "Prix unitaire" },
];

interface ArticlesTableProps {
  articles: TableArticle[];
  sort: ArticleSort;
  onSort: (column: ArticleSortColumn) => void;
  onOpen: (id: string) => void;
  selectable: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}

export function ArticlesTable({ articles, sort, onSort, onOpen, selectable, selectedIds, onSelect }: ArticlesTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            {columns.map(({ key, label }) => (
              <TableHead key={key} aria-sort={sort?.column === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} className="whitespace-nowrap px-3 tracking-normal">
                <Button variant="ghost" size="sm" onClick={() => onSort(key)} className="h-11 px-1 text-xs rounded-md" aria-label={`Trier par ${label}`}>
                  {label}
                  <span className="inline-flex w-4 shrink-0" aria-hidden="true">
                    {sort?.column === key && (sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />)}
                  </span>
                </Button>
              </TableHead>
            ))}
            <TableHead className="tracking-normal">Emplacement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map(article => (
            <TableRow key={article.id} tabIndex={0} aria-label={`Ouvrir ${article.designation}`} data-state={selectedIds.has(article.id) ? "selected" : undefined} className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onOpen(article.id)} onKeyDown={event => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(article.id); }
            }}>
              <TableCell className="px-4">
                <div className="flex items-center gap-2">
                  {selectable && <Checkbox checked={selectedIds.has(article.id)} aria-label={`Sélectionner ${article.designation}`} onClick={event => event.stopPropagation()} onCheckedChange={() => onSelect(article.id)} />}
                  <Badge className={article.stock === 0 ? "bg-destructive text-destructive-foreground" : article.stock <= article.stock_min ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}>
                    {article.stock}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">{article.reference}</TableCell>
              <TableCell className="min-w-[200px] max-w-[320px] font-medium break-words">
                {article.designation}
                {article.is_draft && <Badge variant="outline" className="block w-fit mt-1 bg-warning/15 text-warning border-warning/40 text-[10px]">⚠️ Fiche incomplète</Badge>}
              </TableCell>
              <TableCell className="min-w-[180px] max-w-[250px] break-words">
                <div>{article.categorie || "—"}</div>
                {article.sous_categorie && <div className="text-xs text-muted-foreground mt-1">{article.sous_categorie}</div>}
              </TableCell>
              <TableCell>{article.marque || "—"}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{article.prix_achat.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</TableCell>
              <TableCell className="min-w-[130px] max-w-[200px] break-words text-muted-foreground">{article.emplacement || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}