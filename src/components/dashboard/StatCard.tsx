import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "destructive";
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  variant = "default" 
}: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-success bg-success-light",
    warning: "border-warning bg-warning-light", 
    destructive: "border-destructive bg-destructive-light"
  };

  const iconStyles = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive"
  };

  return (
    <Card className={cn("shadow-soft hover:shadow-medium transition-shadow", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-foreground">{value}</span>
              {trend && (
                <span className={cn(
                  "text-xs font-medium",
                  trend.value > 0 ? "text-success" : "text-destructive"
                )}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {description}
              </p>
            )}
          </div>
          <Icon className={cn("h-5 w-5 flex-shrink-0 ml-2", iconStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
}