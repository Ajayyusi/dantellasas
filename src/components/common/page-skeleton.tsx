import { Skeleton } from "@/components/ui/skeleton";

import { PageContainer } from "./page-header";

export function PageSkeleton({ variant = "table" }: { variant?: "table" | "cards" | "calendar" | "detail" }) {
  return (
    <PageContainer wide={variant === "calendar"}>
      <div className="flex items-end justify-between pb-5">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : variant === "calendar" ? (
        <Skeleton className="h-[70vh] rounded-xl" />
      ) : variant === "detail" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex gap-3 border-b p-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-0">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
