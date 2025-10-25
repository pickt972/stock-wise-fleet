import { Skeleton } from "@/components/ui/skeleton";

export const ArticleDetailSkeleton = () => {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      {/* Details section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
};
