"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, Trash2Icon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import type { SupplierDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deleteSupplierAction, setSupplierActiveAction } from "../actions";
import type { ProductRow } from "../types";

export function SuppliersTab({
  suppliers,
  products,
  onEdit,
  onNew,
}: {
  suppliers: SupplierDTO[];
  products: ProductRow[];
  onEdit: (s: SupplierDTO) => void;
  onNew: () => void;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [deleting, setDeleting] = useState<SupplierDTO | null>(null);
  const productCount = (id: string) => products.filter((p) => p.supplierId === id).length;

  async function toggleActive(s: SupplierDTO) {
    const res = await setSupplierActiveAction({ id: s.id, active: !s.active });
    if (res.ok) toast.success(s.active ? t("inventory.supplierDeactivated") : t("inventory.supplierActivated"));
    else toast.error(te(res.error));
  }

  const columns: ColumnDef<SupplierDTO, unknown>[] = [
    {
      id: "name",
      header: t("inventory.supplierName"),
      accessorFn: (s) => s.name,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          {row.original.contactName ? <p className="truncate text-xs text-muted-foreground">{row.original.contactName}</p> : null}
        </div>
      ),
    },
    {
      id: "phone",
      header: t("common.phone"),
      accessorFn: (s) => s.phone,
      cell: ({ row }) =>
        row.original.phone ? (
          <a href={`tel:${row.original.phone}`} dir="ltr" className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.phone}
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "email",
      header: t("common.email"),
      accessorFn: (s) => s.email,
      cell: ({ row }) =>
        row.original.email ? (
          <a href={`mailto:${row.original.email}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.email}
          </a>
        ) : (
          "—"
        ),
    },
    { id: "trn", header: t("inventory.trn"), accessorFn: (s) => s.trn, cell: ({ row }) => <span dir="ltr" className="tabular">{row.original.trn || "—"}</span> },
    { id: "products", header: t("inventory.productsCount"), accessorFn: (s) => productCount(s.id), meta: { align: "end" } },
    {
      id: "status",
      header: t("common.status"),
      accessorFn: (s) => (s.active ? 1 : 0),
      cell: ({ row }) =>
        row.original.active ? <Badge variant="success">{t("common.active")}</Badge> : <Badge variant="neutral">{t("common.inactive")}</Badge>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                <PencilIcon />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toggleActive(row.original)}>
                <PowerIcon />
                {row.original.active ? t("inventory.deactivate") : t("inventory.activate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleting(row.original)}>
                <Trash2Icon />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={suppliers}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.name} ${s.contactName} ${s.phone} ${s.email} ${s.trn}`}
        searchPlaceholder={t("inventory.searchSuppliers")}
        facets={[
          {
            id: "active",
            label: t("common.status"),
            options: [
              { value: "active", label: t("common.active") },
              { value: "inactive", label: t("common.inactive") },
            ],
            match: (s, v) => (v === "active" ? s.active : !s.active),
          },
        ]}
        onRowClick={onEdit}
        csv={
          org.can("export_data")
            ? {
                filename: "suppliers",
                columns: [
                  { header: t("inventory.supplierName"), value: (s) => s.name },
                  { header: t("inventory.contactName"), value: (s) => s.contactName },
                  { header: t("common.phone"), value: (s) => s.phone },
                  { header: t("common.email"), value: (s) => s.email },
                  { header: t("inventory.trn"), value: (s) => s.trn },
                  { header: t("common.notes"), value: (s) => s.notes },
                  { header: t("common.status"), value: (s) => (s.active ? t("common.active") : t("common.inactive")) },
                ],
              }
            : undefined
        }
        mobileCard={(s) => (
          <div className={cn("flex items-center justify-between gap-3", !s.active && "opacity-60")}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="truncate text-[13px] text-muted-foreground">{[s.contactName, s.phone].filter(Boolean).join(" · ") || s.email || "—"}</p>
            </div>
            {!s.active ? <Badge variant="neutral">{t("common.inactive")}</Badge> : null}
          </div>
        )}
        empty={
          <EmptyState
            icon={TruckIcon}
            title={t("inventory.emptySuppliers")}
            description={t("inventory.emptySuppliersHint")}
            action={
              <Button onClick={onNew}>
                <PlusIcon />
                {t("inventory.addSupplier")}
              </Button>
            }
          />
        }
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("inventory.deleteSupplier")}
        description={deleting ? t("inventory.deleteSupplierConfirm", { name: deleting.name }) : undefined}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteSupplierAction({ id: deleting.id });
          if (res.ok) toast.success(t("inventory.supplierDeleted"));
          else toast.error(te(res.error));
        }}
      />
    </>
  );
}
