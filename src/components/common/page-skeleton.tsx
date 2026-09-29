import { Skeleton } from "@/components/ui/skeleton";

import { PageContainer } from "./page-header";

export function PageSkeleton({ variant = "table" }: { variant?: "table" | "cards" | "calendar" | "detail" }) {
  return (
    <PageContainer wide={variant === "calendar"}>
      <div className="flex items-end justify-between pb-7">
        <div className="grid gap-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="hidden h-10 w-36 sm:block" />
      </div>
      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-10 rounded-xl" />
              </div>
              <Skeleton className="mt-4 h-8 w-32" />
              <Skeleton className="mt-4 h-4 w-40" />
            </div>
          ))}
        </div>
      ) : variant === "calendar" ? (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex gap-3 pb-4">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="ms-auto h-10 w-32" />
          </div>
          <Skeleton className="h-[64vh] rounded-xl" />
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex gap-3 border-b p-5">
            <Skeleton className="h-11 w-72" />
            <Skeleton className="h-11 w-36" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-6 py-4 last:border-0">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
