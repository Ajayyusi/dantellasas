import "server-only";

import type { DateRange } from "@/lib/dates";
import type { AppContext } from "@/lib/tenancy/context";

import { loadReport } from "../loader";
import type { LoadedReport, ReportId } from "../types";
import { ReportBody, ReportError } from "./report-body";

/**
 * Server component streamed inside the page's Suspense boundary: loads and
 * aggregates one report. A failed load renders an inline error with retry,
 * keeping the picker and filters usable.
 */
export async function ReportContent({ ctx, report, range }: { ctx: AppContext; report: ReportId; range: DateRange }) {
  let loaded: LoadedReport;
  try {
    loaded = await loadReport(ctx, report, range);
  } catch (error) {
    console.error(`[reports] failed to load "${report}"`, error);
    return <ReportError />;
  }
  return <ReportBody report={loaded} range={range} />;
}
