import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
  index?: number;
  /** Tonalité iOS (couleur de l'icône dans une pastille) */
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
}

const toneClasses: Record<NonNullable<KPICardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

/**
 * KPI Card style iOS : pastille colorée + valeur en chiffres tabulaires.
 */
export function KPICard({ icon, value, label, className, index = 0, tone = "primary" }: KPICardProps) {
  return (
    <Card
      className={cn(
        "p-4 hover:bg-muted/40 transition-all animate-fade-in opacity-0 [animation-fill-mode:forwards] active:scale-[0.98]",
        className
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-col items-start gap-2.5">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", toneClasses[tone])}>
          {icon}
        </div>
        <div className="space-y-0.5">
          <div className="text-[22px] font-bold text-foreground tabular-nums leading-none tracking-tight">
            {value}
          </div>
          <div className="text-[12px] text-muted-foreground font-medium">
            {label}
          </div>
        </div>
      </div>
    </Card>
  );
}
