"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/client";
import type { AttendanceDTO, LeaveDTO } from "@/lib/types";

import type { StaffPick } from "./leave-dialog";
import { LeavePanel } from "./leave-panel";
import { RecordsTable } from "./records-table";
import { TodayBoard, type BoardEntry } from "./today-board";
import { useNow } from "./use-now";

export type AttendanceTab = "board" | "records" | "leave";

export function AttendanceView({
  tab: initialTab,
  today,
  nowIso,
  board,
  records,
  range,
  branchFilter,
  leave,
  staff,
}: {
  tab: AttendanceTab;
  today: string;
  nowIso: string;
  board: { scheduled: BoardEntry[]; others: BoardEntry[] };
  records: AttendanceDTO[];
  range: { from: string; to: string };
  branchFilter: string;
  leave: LeaveDTO[];
  staff: StaffPick[];
}) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const now = useNow(nowIso);
  const [tab, setTab] = useState<AttendanceTab>(initialTab);
  const pendingLeave = leave.filter((l) => l.status === "requested").length;

  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (tab !== "board") next.set("tab", tab);
    if (range.from !== today || range.to !== today) {
      next.set("from", range.from);
      next.set("to", range.to);
    }
    if (branchFilter !== "all") next.set("branch", branchFilter);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `/staff/attendance?${qs}` : "/staff/attendance", { scroll: false });
  };

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={range.from}
        max={range.to}
        onChange={(e) => e.target.value && navigate({ tab: "records", from: e.target.value })}
        aria-label={t("common.from")}
        className="h-8 w-auto text-[14px]"
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="date"
        value={range.to}
        min={range.from}
        onChange={(e) => e.target.value && navigate({ tab: "records", to: e.target.value })}
        aria-label={t("common.to")}
        className="h-8 w-auto text-[14px]"
      />
      {org.branches.length > 1 ? (
        <Select value={branchFilter} onValueChange={(v) => navigate({ tab: "records", branch: v === "all" ? null : v })}>
          <SelectTrigger size="sm" className="w-auto min-w-36" aria-label={t("common.branch")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allBranches")}</SelectItem>
            {org.branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="-ms-2 mb-2 text-muted-foreground">
        <Link href="/staff">
          <ArrowLeftIcon className="rtl-flip" />
          {t("staff.title")}
        </Link>
      </Button>
      <PageHeader title={t("attendance.title")} description={t("attendance.description")} />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as AttendanceTab);
          navigate({ tab: v === "board" ? null : v });
        }}
      >
        <TabsList>
          <TabsTrigger value="board">{t("attendance.tabs.board")}</TabsTrigger>
          <TabsTrigger value="records">{t("attendance.tabs.records")}</TabsTrigger>
          <TabsTrigger value="leave">
            {t("attendance.tabs.leave")}
            {pendingLeave > 0 ? <Badge variant="warning">{pendingLeave}</Badge> : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          <p className="mb-4 font-display text-[26px] font-semibold leading-tight">{org.dateKey(today, "dateLong")}</p>
          <TodayBoard scheduled={board.scheduled} others={board.others} now={now} />
        </TabsContent>
        <TabsContent value="records">
          <RecordsTable records={records} today={today} now={now} toolbar={filters} csvName={`attendance-${range.from}-${range.to}`} />
        </TabsContent>
        <TabsContent value="leave">
          <LeavePanel leave={leave} staff={staff} defaultStaffId={null} today={today} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
