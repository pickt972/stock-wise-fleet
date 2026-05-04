import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
  index?: number;
  /** Tonalité (couleur de la pastille icône) */
  tone?: "primary" | "success" | "warning" | "destructive" | "muted" | "accent";
  /** Optionnel : delta affiché sous le label (ex: "+12%") */
  trend?: { value: string; positive?: boolean };
  /** Texte d'aide secondaire (ex: "vs hier") */
  helper?: string;
}

const toneRing: Record<NonNullable<KPICardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary ring-primary/15",
  accent: "bg-accent/12 text-accent ring-accent/20",
  success: "bg-success/12 text-success ring-success/20",
  warning: "bg-warning/15 text-[hsl(28_90%_38%)] dark:text-warning ring-warning/20",
  destructive: "bg-destructive/12 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

/**
 * KPI Card SaaS premium :
 * - Layout horizontal : valeur + label à gauche, pastille icône à droite (style Stripe / Linear)
 * - Pastille avec double-ring décoratif pour effet "premium"
 * - Trend optionnel avec flèche directionnelle
 * - Animation fade-in séquentielle
 */
export function KPICard({
  icon,
  value,
  label,
  className,
  index = 0,
  tone = "primary",
  trend,
  helper,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        "p-4 sm:p-5 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200",
        "animate-fade-in opacity-0 [animation-fill-mode:forwards]",
        className,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header : pastille icône en haut, séparée de la valeur */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </p>
        <div
          className={cn(
            "h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center flex-shrink-0",
            "ring-2",
            toneRing[tone],
          )}
        >
          {icon}
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="text-[22px] sm:text-[26px] font-bold text-foreground tabular-nums leading-none tracking-tight break-all">
          {value}
        </div>
          {(trend || helper) && (
            <div className="flex items-center gap-1.5 pt-1">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums",
                    trend.positive ? "text-success" : "text-destructive",
                  )}
                >
                  {trend.positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {trend.value}
                </span>
              )}
              {helper && (
                <span className="text-[12px] text-muted-foreground">{helper}</span>
              )}
            </div>
          )}
      </div>
    </Card>
  );
}
