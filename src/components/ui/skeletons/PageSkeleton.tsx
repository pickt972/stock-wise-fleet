import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Header simulé */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Rows simulées */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg border border-border"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
