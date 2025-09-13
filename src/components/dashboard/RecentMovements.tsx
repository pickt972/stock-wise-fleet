import { ArrowDownToLine, ArrowUpFromLine, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const movements = [
  {
    id: 1,
    type: "entree",
    article: "Filtre à air",
    quantity: 10,
    reference: "AF-001",
    time: "Il y a 2h",
    user: "Marie Dupont"
  },
  {
    id: 2,
    type: "sortie",
    article: "Huile moteur 5W30",
    quantity: 2,
    reference: "HM-530",
    time: "Il y a 3h",
    user: "Jean Martin",
    vehicle: "AB-123-CD"
  },
  {
    id: 3,
    type: "entree",
    article: "Plaquettes frein avant",
    quantity: 5,
    reference: "PF-001",
    time: "Il y a 5h",
    user: "Pierre Leclerc"
  },
  {
    id: 4,
    type: "sortie",
    article: "Batterie 12V",
    quantity: 1,
    reference: "BAT-12V",
    time: "Il y a 6h",
    user: "Sophie Bernard",
    vehicle: "CD-456-EF"
  }
];

export function RecentMovements() {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Mouvements Récents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {movements.map((movement) => (
          <div key={movement.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                movement.type === "entree" 
                  ? "bg-success-light text-success" 
                  : "bg-warning-light text-warning"
              }`}>
                {movement.type === "entree" ? (
                  <ArrowDownToLine className="h-4 w-4" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">{movement.article}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{movement.reference}</span>
                  <span>•</span>
                  <span>{movement.user}</span>
                  {movement.vehicle && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{movement.vehicle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                variant={movement.type === "entree" ? "default" : "secondary"}
                className="text-xs"
              >
                {movement.type === "entree" ? "+" : "-"}{movement.quantity}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {movement.time}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}