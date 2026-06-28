import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  rows?: number;
  className?: string;
}

export function PageSkeleton({ rows = 6, className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-4 animate-in fade-in duration-300", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40 rounded-xl" />
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[60, 48, 56, 40].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card"
            style={{ opacity: 1 - i * 0.07 }}
          >
            <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 rounded-lg" style={{ width: `${55 + (i % 3) * 15}%` }} />
              <Skeleton className="h-3 rounded-lg" style={{ width: `${35 + (i % 4) * 10}%` }} />
            </div>
            <Skeleton className="h-6 w-14 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
