import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      "animate-in fade-in slide-in-from-bottom-3 duration-300",
      className,
    )}>
      {/* Icon container with subtle glow ring */}
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/5 scale-125 blur-md" />
        <div className="relative h-16 w-16 rounded-2xl bg-primary/8 border border-primary/12 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>

      <h3 className="text-[16px] font-semibold text-foreground mb-1.5 tracking-tight">{title}</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed mb-5">{description}</p>

      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="rounded-xl shadow-soft animate-glow-pulse"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
