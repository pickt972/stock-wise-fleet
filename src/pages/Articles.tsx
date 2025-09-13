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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Articles</h1>
          <p className="text-muted-foreground">Gérez votre catalogue de pièces détachées</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Article
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, désignation ou marque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Liste des Articles ({filteredArticles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => {
                const stockStatus = getStockStatus(article.stock, article.stockMin);
                return (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.reference}</TableCell>
                    <TableCell>{article.designation}</TableCell>
                    <TableCell>{article.marque}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.categorie}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{article.stock}</span>
                        {article.stock <= article.stockMin && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>€{article.prixAchat.toFixed(2)}</TableCell>
                    <TableCell>{article.emplacement}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}