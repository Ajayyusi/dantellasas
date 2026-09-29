"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowUpDownIcon,
  CheckIcon,
  ClockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  UserRoundIcon,
  UserRoundSearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";
import type { StaffDTO } from "@/lib/types";

import { setStaffStatusAction } from "../actions";
import { documentAlerts } from "../utils";
import { DocumentsBadge, StaffStatusBadge } from "./staff-badges";
import { StaffFormSheet } from "./staff-form-sheet";
import { StaffReorderList } from "./staff-reorder-list";
import type { CategoryOption, ServiceOption } from "./services-picker";

/** Phone numbers live on the profile; the column can be turned on from the table menu. */
const STAFF_HIDDEN_COLUMNS = { phone: false };

export function StaffView({
  staff,
  services,
  categories,
  today,
}: {
  staff: StaffDTO[];
  services: ServiceOption[];
  categories: CategoryOption[];
  today: string;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const canManage = org.can("manage_staff");
  const [modeChoice, setMode] = useState<"current" | "archived">("current");
  const [reordering, setReordering] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; staff: StaffDTO | null }>({ open: false, staff: null });
  const [archiving, setArchiving] = useState<StaffDTO | null>(null);

  const current = staff.filter((s) => s.status !== "archived");
  const archived = staff.filter((s) => s.status === "archived");
  // Back to the current list once the last archived member is restored.
  const mode = archived.length === 0 ? "current" : modeChoice;
  const rows = mode === "current" ? current : archived;
  const activeServices = new Set(services.map((s) => s.id));
  const expiring = current.filter((s) => documentAlerts(s.hr, today).length > 0).length;

  async function setStatus(s: StaffDTO, status: StaffDTO["status"]) {
    const res = await setStaffStatusAction({ id: s.id, status });
    if (res.ok) toast.success(status === "archived" ? t("staff.archivedToast") : t("staff.restoredToast"));
    else toast.error(te(res.error));
  }

  const columns = (() => {
    const cols: ColumnDef<StaffDTO, unknown>[] = [
      {
        id: "name",
        header: t("staff.columns.name"),
        accessorFn: (s) => s.displayName,
        enableHiding: false,
        cell: ({ row: { original: s } }) => (
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-10 text-[14px]" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{s.displayName}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              </div>
              {s.email ? <div className="truncate text-[14px] text-muted-foreground">{s.email}</div> : null}
            </div>
          </div>
        ),
      },
      { id: "position", header: t("staff.columns.position"), accessorFn: (s) => s.position, cell: ({ getValue }) => (getValue() as string) || "—" },
    ];
    if (org.branches.length > 1) {
      cols.push({
        id: "branches",
        header: t("staff.columns.branches"),
        enableSorting: false,
        accessorFn: (s) => s.branchIds.map((b) => org.branchName(b)).join(", "),
        cell: ({ row: { original: s } }) => (
          <span className="text-[14px]">
            {s.branchIds.length === 0 ? t("common.allBranches") : s.branchIds.map((b) => org.branchName(b)).join(", ")}
          </span>
        ),
      });
    }
    cols.push(
      {
        id: "status",
        header: t("staff.columns.status"),
        accessorFn: (s) => s.status,
        cell: ({ row: { original: s } }) => <StaffStatusBadge status={s.status} />,
      },
      {
        id: "services",
        header: t("staff.columns.services"),
        accessorFn: (s) => s.serviceIds.filter((id) => activeServices.has(id)).length,
        meta: { align: "end" },
        cell: ({ row: { original: s } }) => (
          <span className="tabular">
            {s.serviceIds.filter((id) => activeServices.has(id)).length}
            <span className="text-muted-foreground">/{services.length}</span>
          </span>
        ),
      },
      {
        id: "documents",
        header: t("staff.columns.documents"),
        enableSorting: false,
        accessorFn: (s) => documentAlerts(s.hr, today).length,
        cell: ({ row: { original: s } }) => <DocumentsBadge hr={s.hr} today={today} />,
      },
      {
        id: "phone",
        header: t("staff.columns.phone"),
        enableSorting: false,
        accessorFn: (s) => s.phone,
        cell: ({ getValue }) => (
          <span dir="ltr" className="tabular text-[14px]">
            {(getValue() as string) || "—"}
          </span>
        ),
      },
    );
    if (canManage) {
      cols.push({
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row: { original: s } }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {/* Non-modal: a modal menu inside a table row froze the page when a Sheet opened afterwards (Chromium). */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push(`/staff/${s.id}`)}>
                  <UserRoundSearchIcon />
                  {t("staff.viewProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSheet({ open: true, staff: s })}>
                  <PencilIcon />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {s.status === "archived" ? (
                  <DropdownMenuItem onSelect={() => setStatus(s, "active")}>
                    <ArchiveRestoreIcon />
                    {t("common.restore")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem destructive onSelect={() => setArchiving(s)}>
                    <ArchiveIcon />
                    {t("common.archive")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      });
    }
    return cols;
  })();

  return (
    <PageContainer>
      <PageHeader
        title={t("staff.title")}
        description={t("staff.description")}
        actions={
          <>
            {org.can("manage_attendance") ? (
              <Button variant="outline" asChild>
                <Link href="/staff/attendance">
                  <ClockIcon />
                  {t("staff.attendanceLink")}
                </Link>
              </Button>
            ) : null}
            {canManage && mode === "current" && current.length > 1 ? (
              <Button variant={reordering ? "secondary" : "outline"} onClick={() => setReordering((r) => !r)}>
                {reordering ? <CheckIcon /> : <ArrowUpDownIcon />}
                {reordering ? t("staff.doneReordering") : t("staff.reorder")}
              </Button>
            ) : null}
            {canManage ? (
              <Button onClick={() => setSheet({ open: true, staff: null })}>
                <PlusIcon />
                {t("staff.addStaff")}
              </Button>
            ) : null}
          </>
        }
      >
        {expiring > 0 ? (
          <p className="mt-2 text-[14px] text-[color-mix(in_oklch,var(--warning)_70%,var(--foreground))]">
            {t("staff.docs.summary", { count: expiring })}
          </p>
        ) : null}
      </PageHeader>

      {staff.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={UserRoundIcon}
            title={t("staff.empty")}
            description={t("staff.emptyHint")}
            action={canManage ? <Button onClick={() => setSheet({ open: true, staff: null })}>{t("staff.addStaff")}</Button> : undefined}
          />
        </div>
      ) : reordering ? (
        <StaffReorderList staff={current} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(s) => s.id}
          initialVisibility={STAFF_HIDDEN_COLUMNS}
          searchText={(s) => `${s.displayName} ${s.firstName} ${s.lastName} ${s.position} ${s.phone} ${s.email}`}
          searchPlaceholder={t("staff.searchPlaceholder")}
          onRowClick={(s) => router.push(`/staff/${s.id}`)}
          toolbar={
            archived.length > 0 ? (
              <Segmented value={mode} onValueChange={(v) => setMode(v as typeof mode)} aria-label={t("common.status")}>
                <SegmentedItem value="current">
                  {t("staff.current")} <span className="tabular text-muted-foreground">{current.length}</span>
                </SegmentedItem>
                <SegmentedItem value="archived">
                  {t("staff.status.archived")} <span className="tabular text-muted-foreground">{archived.length}</span>
                </SegmentedItem>
              </Segmented>
            ) : null
          }
          empty={
            <EmptyState compact icon={UserRoundIcon} title={mode === "archived" ? t("staff.emptyArchived") : t("staff.empty")} />
          }
          mobileCard={(s) => (
            <div className="flex items-center gap-3">
              <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-11 text-[15px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{s.displayName}</div>
                <div className="truncate text-[14px] text-muted-foreground">{s.position || "—"}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StaffStatusBadge status={s.status} />
                <DocumentsBadge hr={s.hr} today={today} />
              </div>
            </div>
          )}
        />
      )}

      <StaffFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        staff={sheet.staff}
        services={services}
        categories={categories}
        staffCount={staff.length}
      />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={t("staff.archiveTitle")}
        description={archiving ? t("staff.archiveConfirm", { name: archiving.displayName }) : undefined}
        destructive
        confirmLabel={t("common.archive")}
        onConfirm={async () => {
          if (archiving) await setStatus(archiving, "archived");
        }}
      />
    </PageContainer>
  );
}

