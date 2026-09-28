"use client";

import { DateRangeFilter } from "@/components/common/date-range-filter";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { useOrg } from "@/components/providers/org-provider";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

import type { ReportId } from "../types";
import { ReportNav } from "./report-nav";

/** Page frame: header, report picker, shared date range; the report streams in as `children`. */
export function ReportsShell({
  report,
  available,
  preset,
  range,
  children,
}: {
  report: ReportId;
  available: ReportId[];
  preset: RangePreset;
  range: DateRange;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const scope = org.branchId ? org.branchName(org.branchId) : t("common.allBranches");
  return (
    <PageContainer wide>
      <PageHeader title={t("reports.title")} description={t("reports.description")} />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <ReportNav current={report} available={available} />
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">{t(`reports.names.${report}`)}</h2>
              <p className="text-sm text-muted-foreground">
                {t(`reports.blurbs.${report}`)} · {scope}
              </p>
            </div>
            <DateRangeFilter key={`${preset}:${range.from}:${range.to}`} preset={preset} range={range} />
          </div>
          {children}
        </div>
      </div>
    </PageContainer>
  );
}
