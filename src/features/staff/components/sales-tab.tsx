"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";

import type { StaffSaleLine } from "../types";

export function SalesTab({
  staffId,
  preset,
  lines,
}: {
  staffId: string;
  preset: "this_month" | "last_month";
  lines: StaffSaleLine[];
}) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const columns: ColumnDef<StaffSaleLine, unknown>[] = [
    { id: "date", header: t("common.date"), accessorFn: (l) => l.dateKey, cell: ({ row: { original: l } }) => org.dateKey(l.dateKey) },
    { id: "invoice", header: t("staff.sales.invoice"), accessorFn: (l) => l.number, cell: ({ getValue }) => <span className="font-medium tabular">{getValue() as string}</span> },
    { id: "client", header: t("common.client"), accessorFn: (l) => l.clientName, cell: ({ getValue }) => (getValue() as string) || t("common.walkIn") },
    {
      id: "item",
      header: t("staff.sales.item"),
      accessorFn: (l) => l.name,
      cell: ({ row: { original: l } }) => (
        <span>
          {l.name}
          {l.quantity > 1 ? <span className="text-muted-foreground"> × {l.quantity}</span> : null}
          <span className="ms-2 text-xs text-muted-foreground">{t(`staff.sales.types.${l.type}`)}</span>
        </span>
      ),
    },
    { id: "amount", header: t("common.amount"), accessorFn: (l) => l.amountMinor, meta: { align: "end" }, cell: ({ getValue }) => org.money(getValue() as number) },
    {
      id: "commission",
      header: t("staff.sales.commission"),
      accessorFn: (l) => l.commissionMinor,
      meta: { align: "end" },
      cell: ({ getValue }) => <span className="font-medium">{org.money(getValue() as number)}</span>,
    },
  ];

  const totals = lines.reduce((s, l) => ({ amount: s.amount + l.amountMinor, commission: s.commission + l.commissionMinor }), { amount: 0, commission: 0 });

  return (
    <div className={pending ? "opacity-60 transition-opacity" : undefined}>
      <DataTable
        data={lines}
        columns={columns}
        getRowId={(l) => l.id}
        searchText={(l) => `${l.number} ${l.clientName} ${l.name}`}
        initialSort={[{ id: "date", desc: true }]}
        toolbar={
          <Segmented
            value={preset}
            onValueChange={(v) =>
              startTransition(() => router.replace(`/staff/${staffId}?tab=sales${v === "last_month" ? "&sales=last_month" : ""}`, { scroll: false }))
            }
            aria-label={t("common.date")}
          >
            <SegmentedItem value="this_month">{t("common.range.this_month")}</SegmentedItem>
            <SegmentedItem value="last_month">{t("common.range.last_month")}</SegmentedItem>
          </Segmented>
        }
        empty={<EmptyState compact icon={ReceiptIcon} title={t("staff.sales.empty")} description={t("staff.sales.emptyHint")} />}
        footer={
          lines.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t bg-muted/30 px-4 py-2.5 text-sm">
              <span>
                <span className="text-muted-foreground">{t("common.total")}: </span>
                <span className="font-semibold tabular">{org.money(totals.amount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">{t("staff.sales.commission")}: </span>
                <span className="font-semibold tabular">{org.money(totals.commission)}</span>
              </span>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
