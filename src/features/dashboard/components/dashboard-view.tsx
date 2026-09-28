"use client";

import { CalendarPlusIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { DateRangeFilter } from "@/components/common/date-range-filter";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { change, StatCard } from "@/components/common/stat-card";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";

import type { DashboardData } from "../queries";
import { RankedPanel, RecentSalesPanel, StatusPanel, TodayPanel } from "./dashboard-panels";
import { RevenueChart } from "./revenue-chart";

export function DashboardView({
  data,
  preset,
  range,
  greeting,
}: {
  data: DashboardData;
  preset: RangePreset;
  range: DateRange;
  greeting: "morning" | "afternoon" | "evening";
}) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const k = data.kpis;
  const firstName = org.user.name.split(" ")[0] || org.user.name;
  const vs = t("dashboard.vsPrevious");
  const hasRevenue = data.series.some((p) => p.netMinor > 0 || p.prevNetMinor > 0);

  return (
    <PageContainer>
      <PageHeader
        title={t(`dashboard.greeting.${greeting}`, { name: firstName })}
        description={t("dashboard.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            {org.can("create_appointments") ? (
              <Button variant="outline" asChild>
                <Link href="/appointments?new=1">
                  <CalendarPlusIcon />
                  {t("nav.appointments")}
                </Link>
              </Button>
            ) : null}
            {org.can("create_sales") ? (
              <Button asChild>
                <Link href="/pos">
                  <ShoppingBagIcon />
                  {t("nav.checkout")}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="mb-5">
        <DateRangeFilter preset={preset} range={range} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.canSales ? (
          <>
            <StatCard
              label={t("dashboard.kpi.net")}
              value={org.money(k.netMinor)}
              delta={change(k.netMinor, k.prevNetMinor)}
              deltaLabel={vs}
            />
            <StatCard
              label={t("dashboard.kpi.avgTicket")}
              value={org.money(k.avgTicketMinor)}
              delta={change(k.avgTicketMinor, k.prevAvgTicketMinor)}
              deltaLabel={t("dashboard.kpi.salesHint", { count: formatNumber(k.sales, locale) })}
            />
          </>
        ) : null}
        <StatCard
          label={t("dashboard.kpi.appointments")}
          value={formatNumber(k.appointments, locale)}
          delta={change(k.appointments, k.prevAppointments)}
          deltaLabel={k.noShows ? t("dashboard.kpi.noShowHint", { count: k.noShows }) : t("dashboard.kpi.completedHint", { count: k.completed })}
        />
        {data.canClients ? (
          <StatCard label={t("dashboard.kpi.newClients")} value={formatNumber(k.newClients, locale)} delta={change(k.newClients, k.prevNewClients)} deltaLabel={vs} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.canSales ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("dashboard.revenue.title")}</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-chart-1" />
                  {t("dashboard.revenue.current")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 bg-muted-foreground/60" />
                  {t("dashboard.revenue.previous")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {hasRevenue ? <RevenueChart data={data.series} /> : <p className="grid h-64 place-items-center text-sm text-muted-foreground">{t("dashboard.revenue.empty")}</p>}
            </CardContent>
          </Card>
        ) : null}
        <StatusPanel statuses={data.statuses} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={data.canSales ? "min-w-0 lg:col-span-1" : "min-w-0 lg:col-span-3"}>
          <TodayPanel appointments={data.today} />
        </div>
        {data.canSales ? (
          <>
            <RankedPanel title={t("dashboard.topServices")} rows={data.topServices} />
            <RankedPanel title={t("dashboard.topStaff")} rows={data.topStaff} />
          </>
        ) : null}
      </div>

      {data.canSales ? (
        <div className="mt-4">
          <RecentSalesPanel transactions={data.recent} />
        </div>
      ) : null}
    </PageContainer>
  );
}
