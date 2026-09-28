import { PageContainer } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSkeleton } from "@/features/reports/components/report-skeleton";

export default function Loading() {
  return (
    <PageContainer wide>
      <div className="grid gap-2 pb-5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="hidden gap-2 lg:grid lg:content-start">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-7 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-9 lg:hidden" />
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:justify-between">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-9 w-64" />
          </div>
          <ReportSkeleton />
        </div>
      </div>
    </PageContainer>
  );
}
