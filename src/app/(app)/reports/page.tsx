import type { Metadata } from "next";
import { Suspense } from "react";

import { canViewReport } from "@/features/reports/loader";
import { ReportContent } from "@/features/reports/components/report-content";
import { ReportSkeleton } from "@/features/reports/components/report-skeleton";
import { ReportsShell } from "@/features/reports/components/reports-shell";
import { isReportId, REPORT_IDS } from "@/features/reports/types";
import { getI18n } from "@/lib/i18n/server";
import { param, rangeFromParams } from "@/lib/range-params";
import { requirePagePermission } from "@/lib/tenancy/context";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("reports.title") };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const ctx = await requirePagePermission("view_reports");
  const sp = await searchParams;
  const { preset, range } = rangeFromParams(sp, ctx.timezone, ctx.settings.locale.weekStartsOn, "this_month");
  const available = REPORT_IDS.filter((id) => canViewReport(ctx, id));
  const requested = param(sp, "report");
  const report = isReportId(requested) && available.includes(requested) ? requested : "revenue";

  return (
    <ReportsShell report={report} available={available} preset={preset} range={range}>
      <Suspense key={`${report}:${range.from}:${range.to}:${ctx.branchId ?? "all"}`} fallback={<ReportSkeleton />}>
        <ReportContent ctx={ctx} report={report} range={range} />
      </Suspense>
    </ReportsShell>
  );
}
