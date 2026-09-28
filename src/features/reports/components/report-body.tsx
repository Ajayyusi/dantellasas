"use client";

import { RotateCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import type { DateRange } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { LoadedReport } from "../types";
import { AppointmentsReport } from "./appointments-report";
import { ClientsReport } from "./clients-report";
import { CommissionsReport } from "./commissions-report";
import { ExpensesReport } from "./expenses-report";
import { PackagesReport } from "./packages-report";
import { PaymentsReport } from "./payments-report";
import { ProductsReport } from "./products-report";
import { Notice } from "./report-parts";
import { RevenueReport } from "./revenue-report";
import { ServicesReport } from "./services-report";
import { StaffReport } from "./staff-report";
import { VatReport } from "./vat-report";

function Report({ report, range }: { report: LoadedReport; range: DateRange }) {
  switch (report.id) {
    case "revenue":
      return <RevenueReport data={report.data} range={range} />;
    case "services":
      return <ServicesReport data={report.data} range={range} />;
    case "products":
      return <ProductsReport data={report.data} range={range} />;
    case "packages":
      return <PackagesReport data={report.data} range={range} />;
    case "payments":
      return <PaymentsReport data={report.data} range={range} />;
    case "staff":
      return <StaffReport data={report.data} range={range} />;
    case "commissions":
      return <CommissionsReport data={report.data} range={range} />;
    case "clients":
      return <ClientsReport data={report.data} range={range} />;
    case "appointments":
      return <AppointmentsReport data={report.data} range={range} />;
    case "expenses":
      return <ExpensesReport data={report.data} range={range} />;
    case "vat":
      return <VatReport data={report.data} range={range} />;
  }
}

const USES_SALES = new Set(["revenue", "services", "products", "packages", "payments", "staff", "commissions", "clients", "expenses", "vat"]);

export function ReportBody({ report, range }: { report: LoadedReport; range: DateRange }) {
  const { t, locale } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-4">
      {report.meta.capped ? <Notice tone="warning">{t("reports.capped")}</Notice> : null}
      {report.meta.ownAppointmentsOnly ? <Notice tone="warning">{t("reports.ownAppointments")}</Notice> : null}
      <Report report={report} range={range} />
      {USES_SALES.has(report.id) ? <Notice>{t("reports.attribution", { days: formatNumber(report.meta.lookbackDays, locale) })}</Notice> : null}
    </div>
  );
}

export function ReportError() {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="rounded-xl border bg-card">
      <ErrorState
        title={t("reports.errorTitle")}
        description={t("reports.errorBody")}
        action={
          <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
            <RotateCwIcon className={pending ? "animate-spin" : undefined} />
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
