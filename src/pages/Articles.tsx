import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardLayout from "./DashboardLayout";

const articles = [
  {
    id: "1",
    reference: "HM-530",
    designation: "Huile moteur 5W30",
    marque: "Castrol",
    categorie: "Consommables",
    stock: 0,
    stockMin: 5,
    stockMax: 50,
    prixAchat: 8.50,
    emplacement: "A1-B2"
  },
  {
    id: "2", 
    reference: "PF-001",
    designation: "Plaquettes frein avant",
    marque: "Brembo",
    categorie: "Freinage",
    stock: 2,
    stockMin: 3,
    stockMax: 20,
    prixAchat: 45.00,
    emplacement: "B2-C1"
  },
  {
    id: "3",
    reference: "AF-001", 
    designation: "Filtre à air",
    marque: "Mann",
    categorie: "Filtration",
    stock: 15,
    stockMin: 5,
    stockMax: 30,
    prixAchat: 12.30,
    emplacement: "C1-D2"
  },
  {
    id: "4",
    reference: "BAT-12V",
    designation: "Batterie 12V 60Ah", 
    marque: "Varta",
    categorie: "Électrique",
    stock: 3,
    stockMin: 2,
    stockMax: 15,
    prixAchat: 89.90,
    emplacement: "D2-E1"
  }
];

export default function Articles() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStockStatus = (stock: number, stockMin: number) => {
    if (stock === 0) return { variant: "destructive" as const, label: "Rupture" };
    if (stock <= stockMin) return { variant: "secondary" as const, label: "Faible" };
    return { variant: "default" as const, label: "OK" };
  };

  const filteredArticles = articles.filter(article =>
    article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.marque.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Articles</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gérez votre inventaire d'articles</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 w-full lg:w-auto flex-shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel Article
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button variant="outline" className="w-full lg:w-auto flex-shrink-0">
          <Filter className="mr-2 h-4 w-4" />
          Filtres
        </Button>
      </div>

      <Card className="w-full max-w-full">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 sm:w-28">Référence</TableHead>
                  <TableHead className="w-32 sm:w-40">Désignation</TableHead>
                  <TableHead className="hidden md:table-cell w-24 sm:w-28">Marque</TableHead>
                  <TableHead className="hidden lg:table-cell w-28">Catégorie</TableHead>
                  <TableHead className="w-16 sm:w-20">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell w-20 sm:w-24">Statut</TableHead>
                  <TableHead className="hidden lg:table-cell w-20 sm:w-24">Prix (€)</TableHead>
                  <TableHead className="hidden xl:table-cell w-24 sm:w-28">Emplacement</TableHead>
                  <TableHead className="w-16 sm:w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => {
                const stockStatus = getStockStatus(article.stock, article.stockMin);
                return (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium text-xs md:text-sm">{article.reference}</TableCell>
                    <TableCell className="text-xs md:text-sm">
                      <div>
                        <div className="font-medium">{article.designation}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{article.marque}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{article.marque}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs">{article.categorie}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">{article.stock}</span>
                        {article.stock <= article.stockMin && (
                          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={stockStatus.variant} className="text-xs">
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">€{article.prixAchat.toFixed(2)}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{article.emplacement}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}