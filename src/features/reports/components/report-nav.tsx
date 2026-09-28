"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { REPORT_GROUPS, type ReportId } from "../types";

function useReportHref() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (id: ReportId) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("report", id);
    return `${pathname}?${sp.toString()}`;
  };
}

/**
 * Report picker: a grouped list on large screens, a select on small ones.
 * Both keep the current date range in the URL.
 */
export function ReportNav({ current, available }: { current: ReportId; available: ReportId[] }) {
  const { t } = useI18n();
  const href = useReportHref();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const groups = REPORT_GROUPS.map((g) => ({ ...g, reports: g.reports.filter((r) => available.includes(r)) })).filter((g) => g.reports.length > 0);

  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <Select value={current} onValueChange={(v) => startTransition(() => router.push(href(v as ReportId), { scroll: false }))}>
          <SelectTrigger className="w-full sm:w-72" aria-label={t("reports.picker")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectGroup key={g.key}>
                <SelectLabel>{t(`reports.groups.${g.key}`)}</SelectLabel>
                {g.reports.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`reports.names.${r}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {pending ? <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label={t("common.loading")} /> : null}
      </div>
      <nav aria-label={t("reports.picker")} className="hidden lg:block">
        <div className="sticky top-20 grid gap-5">
          {groups.map((g) => (
            <div key={g.key} className="grid gap-0.5">
              <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(`reports.groups.${g.key}`)}</p>
              {g.reports.map((r) => (
                <Link
                  key={r}
                  href={href(r)}
                  scroll={false}
                  aria-current={r === current ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    r === current ? "bg-primary/10 font-medium text-primary hover:bg-primary/10" : "text-foreground/80",
                  )}
                >
                  {t(`reports.names.${r}`)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
