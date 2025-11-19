import { TrendingUp, Package, Euro } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EntryStatsProps {
  todayCount: number;
  monthCount: number;
  totalValue: number;
}

export function EntryStats({ todayCount, monthCount, totalValue }: EntryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entrées du jour</p>
              <p className="text-3xl font-bold">{todayCount}</p>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entrées du mois</p>
              <p className="text-3xl font-bold">{monthCount}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valeur totale</p>
              <p className="text-3xl font-bold">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(totalValue)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
