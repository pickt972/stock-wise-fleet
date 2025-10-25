import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function KPICard({ icon, value, label, className }: KPICardProps) {
  return (
    <Card className={cn(
      "p-4 border border-border bg-muted/30 hover:bg-muted/50 transition-colors",
      className
    )}>
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="text-muted-foreground">
          {icon}
        </div>
        <div className="text-2xl font-bold text-foreground">
          {value}
        </div>
        <div className="text-sm text-muted-foreground">
          {label}
        </div>
      </div>
    </Card>
  );
}
