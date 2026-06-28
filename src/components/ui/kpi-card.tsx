import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
  index?: number;
  tone?: "primary" | "success" | "warning" | "destructive" | "muted" | "accent";
  trend?: { value: string; positive?: boolean };
  helper?: string;
  live?: boolean;
}

const toneConfig: Record<NonNullable<KPICardProps["tone"]>, { ring: string; dot: string }> = {
  primary:     { ring: "bg-primary/10 text-primary",       dot: "bg-primary" },
  accent:      { ring: "bg-accent/10 text-accent",         dot: "bg-accent" },
  success:     { ring: "bg-success/10 text-success",       dot: "bg-success" },
  warning:     { ring: "bg-warning/10 text-warning",       dot: "bg-warning" },
  destructive: { ring: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  muted:       { ring: "bg-muted text-muted-foreground",   dot: "bg-muted-foreground" },
};

export function KPICard({
  icon, value, label, className, index = 0, tone = "primary",
  trend, helper, live = false,
}: KPICardProps) {
  const cfg = toneConfig[tone];

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-3 sm:p-4",
        "hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200",
        // spring entrance: scale + fade
        "opacity-0 translate-y-1 [animation-fill-mode:forwards]",
        "[animation-name:kpi-spring] [animation-duration:500ms] [animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
        className,
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Icon + live dot */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0", cfg.ring)}>
          {icon}
        </div>
        {live && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", cfg.dot)} />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-[20px] sm:text-[24px] font-bold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </div>

      {/* Label */}
      <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">{label}</p>

      {/* Trend */}
      {trend && (
        <div className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1.5 tabular-nums",
          trend.positive ? "text-success" : "text-destructive",
        )}>
          {trend.positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {trend.value}
          {helper && <span className="text-muted-foreground font-normal ml-0.5">{helper}</span>}
        </div>
      )}
    </Card>
  );
}
