"use client";

import {
  CalendarCheckIcon,
  CrownIcon,
  HourglassIcon,
  ReceiptTextIcon,
  RepeatIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { DateRangeFilter } from "@/components/common/date-range-filter";
import { PageContainer, SectionCard } from "@/components/common/page-header";
import { change, StatCard } from "@/components/common/stat-card";
import { CountUp } from "@/components/motion/count-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { useOrg } from "@/components/providers/org-provider";
import { todayKey, type DateRange, type RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { DashboardData } from "../queries";
import { BookingsChart, RetentionDonut, StatusDonut } from "./dashboard-charts";
import { RankedPanel, RecentSalesPanel, TodayPanel } from "./dashboard-panels";
import { BusyHeatmap, CategoryBars } from "./insight-panels";
import { RevenueChart } from "./revenue-chart";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[19px] font-bold leading-tight">{children}</h2>;
}

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
  const today = data.todaySummary;
  const firstName = org.user.name.split(" ")[0] || org.user.name;
  const vs = t("dashboard.vsPrevious");
  const money = (n: number) => org.money(Math.round(n));
  const count = (n: number) => formatNumber(Math.round(n), locale);
  const hasRevenue = data.series.some((p) => p.netMinor > 0 || p.prevNetMinor > 0);
  const top = data.topServices[0];
  const rate = data.retention.rate === null ? null : `${Math.round(data.retention.rate * 100)}%`;

  return (
    <PageContainer>
      <section className="mb-7 min-w-0">
        <h1 className="font-display text-[26px] font-bold leading-[1.15] sm:text-[30px]">
          {t(`dashboard.greeting.${greeting}`, { name: firstName })}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {org.dateKey(todayKey(org.timezone), "dateLong")}
          <span className="hidden md:inline"> · {t("dashboard.subtitle")}</span>
        </p>
      </section>

      <div className="mb-3">
        <SectionTitle>{t("dashboard.sections.today")}</SectionTitle>
      </div>
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {data.canSales ? (
          <StaggerItem>
            <StatCard
              icon={WalletIcon}
              tone="rose"
              label={t("dashboard.kpi.todayRevenue")}
              value={<CountUp value={today.revenueMinor} format={money} />}
              hint={t("dashboard.kpi.todayRevenueHint", { count: count(today.sales) })}
            />
          </StaggerItem>
        ) : null}
        <StaggerItem>
          <StatCard
            icon={CalendarCheckIcon}
            tone="gold"
            label={t("dashboard.kpi.todayAppointments")}
            value={<CountUp value={today.appointments} format={count} />}
            hint={t("dashboard.kpi.todayAppointmentsHint", { upcoming: count(today.upcoming), completed: count(today.completed) })}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            icon={UsersIcon}
            tone="sage"
            label={t("dashboard.kpi.clientsToday")}
            value={<CountUp value={today.clients} format={count} />}
            hint={t("dashboard.kpi.clientsTodayHint")}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            icon={SparklesIcon}
            tone="blue"
            label={t("dashboard.kpi.staffToday")}
            value={<CountUp value={data.staffWorking} format={count} />}
            hint={t("dashboard.kpi.staffTodayHint")}
          />
        </StaggerItem>
      </Stagger>

      <div className="mb-3 mt-9 flex flex-wrap items-end justify-between gap-3">
        <SectionTitle>{t("dashboard.sections.performance")}</SectionTitle>
        <DateRangeFilter preset={preset} range={range} />
      </div>
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {data.canSales ? (
          <>
            <StaggerItem>
              <StatCard
                icon={TrendingUpIcon}
                tone="rose"
                label={t("dashboard.kpi.net")}
                value={<CountUp value={k.netMinor} format={money} />}
                delta={change(k.netMinor, k.prevNetMinor)}
                deltaLabel={vs}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={ReceiptTextIcon}
                tone="gold"
                label={t("dashboard.kpi.avgTicket")}
                value={<CountUp value={k.avgTicketMinor} format={money} />}
                delta={change(k.avgTicketMinor, k.prevAvgTicketMinor)}
                deltaLabel={t("dashboard.kpi.salesHint", { count: count(k.sales) })}
              />
            </StaggerItem>
          </>
        ) : (
          <StaggerItem>
            <StatCard
              icon={CalendarCheckIcon}
              tone="gold"
              label={t("dashboard.kpi.appointments")}
              value={<CountUp value={k.appointments} format={count} />}
              delta={change(k.appointments, k.prevAppointments)}
              deltaLabel={vs}
            />
          </StaggerItem>
        )}
        {data.canClients ? (
          <StaggerItem>
            <StatCard
              icon={UserPlusIcon}
              tone="sage"
              label={t("dashboard.kpi.newClients")}
              value={<CountUp value={k.newClients} format={count} />}
              delta={change(k.newClients, k.prevNewClients)}
              deltaLabel={vs}
            />
          </StaggerItem>
        ) : null}
        {data.canSales ? (
          <>
            <StaggerItem>
              <StatCard
                icon={RepeatIcon}
                tone="mauve"
                label={t("dashboard.kpi.returning")}
                value={<CountUp value={data.retention.returning} format={count} />}
                hint={rate ? t("dashboard.kpi.returningHint", { rate }) : t("dashboard.kpi.returningNoBaseline")}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={HourglassIcon}
                tone="taupe"
                label={t("dashboard.kpi.pending")}
                value={<CountUp value={data.pending.balanceMinor} format={money} />}
                hint={data.pending.count ? t("dashboard.kpi.pendingHint", { count: count(data.pending.count) }) : t("dashboard.kpi.pendingNone")}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={CrownIcon}
                tone="gold"
                label={t("dashboard.kpi.topService")}
                value={<span className="block truncate text-[clamp(1.125rem,10cqi,1.375rem)] tracking-[-0.02em]">{top?.name ?? "—"}</span>}
                hint={top ? t("dashboard.kpi.topServiceHint", { amount: org.money(top.revenueMinor) }) : undefined}
              />
            </StaggerItem>
          </>
        ) : null}
      </Stagger>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {data.canSales ? (
          <SectionCard
            className="lg:col-span-2"
            title={t("dashboard.revenue.title")}
            actions={<Legend current={t("dashboard.revenue.current")} previous={t("dashboard.revenue.previous")} swatch="var(--chart-1)" />}
          >
            {hasRevenue ? <RevenueChart data={data.series} /> : <p className="grid h-72 place-items-center text-sm text-muted-foreground">{t("dashboard.revenue.empty")}</p>}
          </SectionCard>
        ) : null}
        <SectionCard title={t("dashboard.statuses.title")} className={cn(!data.canSales && "lg:col-span-3")}>
          <StatusDonut statuses={data.statuses} />
        </SectionCard>

        <SectionCard
          className={data.canSales ? "lg:col-span-2" : "lg:col-span-3"}
          title={t("dashboard.bookings.title")}
          description={t("dashboard.bookings.description")}
          actions={<Legend current={t("dashboard.revenue.current")} previous={t("dashboard.revenue.previous")} swatch="var(--chart-muted)" />}
        >
          <BookingsChart data={data.bookings} />
        </SectionCard>
        {data.canSales ? (
          <SectionCard title={t("dashboard.retention.title")} description={t("dashboard.retention.description")}>
            <RetentionDonut retention={data.retention} />
          </SectionCard>
        ) : null}

        <SectionCard className={data.canSales ? "lg:col-span-2" : "lg:col-span-3"} title={t("dashboard.busy.title")} description={t("dashboard.busy.description")}>
          <BusyHeatmap busy={data.busy} />
        </SectionCard>
        {data.canSales ? (
          <SectionCard title={t("dashboard.categories.title")} description={t("dashboard.categories.description")}>
            <CategoryBars rows={data.categories} />
          </SectionCard>
        ) : null}

        <div className={data.canSales ? "min-w-0" : "min-w-0 lg:col-span-3"}>
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

function Legend({ current, previous, swatch }: { current: string; previous: string; swatch: string }) {
  return (
    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full ring-1 ring-inset ring-black/5" style={{ backgroundColor: swatch }} />
        {current}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed border-muted-foreground/60" />
        {previous}
      </span>
    </div>
  );
}
