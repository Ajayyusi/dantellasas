import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a report loads: KPI row, a chart panel and table rows. */
export function ReportSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="rounded-xl border bg-card">
        <div className="flex gap-3 border-b p-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="ms-auto h-9 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
