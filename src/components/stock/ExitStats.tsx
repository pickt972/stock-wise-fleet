import { TrendingDown, PackageMinus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ExitStatsProps {
  todayCount: number;
  monthCount: number;
}

export function ExitStats({ todayCount, monthCount }: ExitStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sorties du jour</p>
              <p className="text-3xl font-bold">{todayCount}</p>
            </div>
            <PackageMinus className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sorties du mois</p>
              <p className="text-3xl font-bold">{monthCount}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
