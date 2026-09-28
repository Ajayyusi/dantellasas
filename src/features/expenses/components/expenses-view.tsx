"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FolderCogIcon, PaperclipIcon, PlusIcon, WalletIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { csvMoney } from "@/components/data-table/csv";
import { DataTable, type FacetFilter } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { localName } from "@/lib/localize";
import type { ExpenseCategoryDTO } from "@/lib/types";

import { deleteExpenseAction, saveExpenseCategoryAction, setExpenseCategoryActiveAction } from "../actions";
import type { ExpenseRow, SupplierOption } from "../types";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { CategoriesDialog } from "./categories-dialog";
import { ExpenseFormSheet } from "./expense-form-sheet";
import { ExpenseSummary, type CategoryTotal } from "./expense-summary";
import { paymentMethodLabel } from "./labels";

export function ExpensesView({
  expenses,
  categories,
  suppliers,
  preset,
  range,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseCategoryDTO[];
  suppliers: SupplierOption[];
  preset: RangePreset;
  range: DateRange;
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const canEdit = org.can("create_expenses");
  // Branch column/filter only when several branches are in view ("All branches").
  const multiBranch = org.branches.length > 1 && !org.branchId;
  const methods = org.settings.payments.methods;
  const [sheet, setSheet] = useState<{ open: boolean; expense: ExpenseRow | null }>({ open: false, expense: null });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);

  const categoryLabel = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return (e: ExpenseRow) => {
      const c = byId.get(e.categoryId);
      return c ? localName(c, locale) : e.categoryName || "—";
    };
  }, [categories, locale]);
  const methodLabel = (id: string) => paymentMethodLabel(methods, id, t);

  const totals = useMemo(() => {
    const byCat = new Map<string, CategoryTotal>();
    let total = 0;
    let tax = 0;
    for (const e of expenses) {
      total += e.amountMinor;
      tax += e.taxMinor;
      const cur = byCat.get(e.categoryId) ?? { id: e.categoryId, label: categoryLabel(e), amountMinor: 0 };
      cur.amountMinor += e.amountMinor;
      byCat.set(e.categoryId, cur);
    }
    return { total, tax, byCategory: [...byCat.values()].sort((a, b) => b.amountMinor - a.amountMinor) };
  }, [expenses, categoryLabel]);

  const openEdit = (e: ExpenseRow) => canEdit && setSheet({ open: true, expense: e });

  const columns = useMemo<ColumnDef<ExpenseRow, unknown>[]>(() => {
    const cols: ColumnDef<ExpenseRow, unknown>[] = [
      {
        id: "date",
        header: t("common.date"),
        accessorFn: (e) => e.dateKey,
        cell: ({ row }) => <span className="whitespace-nowrap tabular">{org.dateKey(row.original.dateKey)}</span>,
      },
      {
        id: "category",
        header: t("common.category"),
        accessorFn: (e) => categoryLabel(e),
        cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
      },
      {
        id: "vendor",
        header: t("expenses.vendor"),
        accessorFn: (e) => e.vendor,
        cell: ({ row }) =>
          row.original.vendor ? (
            <span dir="auto" className="block max-w-36 truncate text-start" title={row.original.vendor}>
              {row.original.vendor}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "description",
        header: t("common.description"),
        accessorFn: (e) => e.description,
        enableSorting: false,
        cell: ({ row }) => (
          <span dir="auto" className="block max-w-40 truncate text-start text-muted-foreground" title={row.original.description}>
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "method",
        header: t("expenses.paymentMethod"),
        accessorFn: (e) => methodLabel(e.paymentMethod),
        cell: ({ getValue }) => <span className="whitespace-nowrap">{String(getValue())}</span>,
      },
    ];
    if (multiBranch) {
      cols.push({ id: "branch", header: t("common.branch"), accessorFn: (e) => org.branchName(e.branchId) });
    }
    cols.push(
      {
        id: "amount",
        header: t("expenses.amount"),
        accessorFn: (e) => e.amountMinor,
        meta: { align: "end" },
        cell: ({ row }) => <span className="font-medium">{org.money(row.original.amountMinor)}</span>,
      },
      {
        id: "vat",
        header: t("expenses.vat"),
        accessorFn: (e) => e.taxMinor,
        meta: { align: "end" },
        cell: ({ row }) => (row.original.taxMinor ? org.money(row.original.taxMinor) : <span className="text-muted-foreground">—</span>),
      },
      {
        id: "attachment",
        header: () => <PaperclipIcon className="size-3.5" aria-label={t("expenses.attachment")} />,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <AttachmentLink expense={row.original} />,
      },
    );
    return cols;
    // methodLabel derives from t + methods
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, org, categoryLabel, multiBranch, methods]);

  const facets = useMemo<FacetFilter<ExpenseRow>[]>(() => {
    const catIds = [...new Set(expenses.map((e) => e.categoryId))];
    const methodIds = [...new Set(expenses.map((e) => e.paymentMethod).filter(Boolean))];
    const list: FacetFilter<ExpenseRow>[] = [
      {
        id: "category",
        label: t("common.category"),
        options: catIds
          .map((id) => ({ value: id, label: categoryLabel(expenses.find((e) => e.categoryId === id)!) }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        match: (e, v) => e.categoryId === v,
      },
      {
        id: "method",
        label: t("expenses.paymentMethod"),
        options: methodIds.map((id) => ({ value: id, label: paymentMethodLabel(methods, id, t) })),
        match: (e, v) => e.paymentMethod === v,
      },
    ];
    if (multiBranch) {
      list.push({
        id: "branch",
        label: t("common.branch"),
        options: org.branches.map((b) => ({ value: b.id, label: b.name })),
        match: (e, v) => e.branchId === v,
      });
    }
    return list;
  }, [expenses, categoryLabel, methods, multiBranch, org.branches, t]);

  return (
    <PageContainer>
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.description")}
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                <FolderCogIcon />
                {t("expenses.manageCategories")}
              </Button>
              <Button onClick={() => setSheet({ open: true, expense: null })}>
                <PlusIcon />
                {t("expenses.addExpense")}
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4">
        <DateRangeFilter key={`${preset}-${range.from}-${range.to}`} preset={preset} range={range} />
        <ExpenseSummary totalMinor={totals.total} taxMinor={totals.tax} count={expenses.length} byCategory={totals.byCategory} />
        <DataTable
          data={expenses}
          columns={columns}
          getRowId={(e) => e.id}
          searchText={(e) => `${e.vendor} ${e.description} ${categoryLabel(e)} ${e.categoryName}`}
          searchPlaceholder={t("expenses.searchPlaceholder")}
          facets={facets}
          onRowClick={canEdit ? openEdit : undefined}
          csv={
            org.can("export_data")
              ? {
                  filename: `expenses-${range.from}-${range.to}`,
                  columns: [
                    { header: t("common.date"), value: (e) => e.dateKey },
                    { header: t("common.category"), value: (e) => categoryLabel(e) },
                    { header: t("expenses.vendor"), value: (e) => e.vendor },
                    { header: t("common.description"), value: (e) => e.description },
                    { header: t("expenses.paymentMethod"), value: (e) => (e.paymentMethod ? methodLabel(e.paymentMethod) : "") },
                    { header: t("common.branch"), value: (e) => org.branchName(e.branchId) },
                    { header: t("expenses.amount"), value: (e) => csvMoney(e.amountMinor) },
                    { header: t("expenses.vat"), value: (e) => csvMoney(e.taxMinor) },
                    { header: t("expenses.attachment"), value: (e) => e.attachment?.url ?? "" },
                  ],
                }
              : undefined
          }
          mobileCard={(e) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{categoryLabel(e)}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {org.dateKey(e.dateKey)}
                  {e.vendor ? ` · ${e.vendor}` : ""}
                </p>
                {e.description ? <p className="line-clamp-1 text-[13px] text-muted-foreground">{e.description}</p> : null}
              </div>
              <div className="shrink-0 text-end">
                <p className="text-sm font-semibold tabular">{org.money(e.amountMinor)}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  {e.attachment ? <PaperclipIcon className="size-3" /> : null}
                  {e.taxMinor ? `${t("expenses.vat")} ${org.money(e.taxMinor)}` : methodLabel(e.paymentMethod)}
                </p>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={WalletIcon}
              title={t("expenses.empty")}
              description={t("expenses.emptyHint")}
              action={
                canEdit ? (
                  <Button onClick={() => setSheet({ open: true, expense: null })}>
                    <PlusIcon />
                    {t("expenses.addExpense")}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      <ExpenseFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        expense={sheet.expense}
        categories={categories}
        suppliers={suppliers}
        onDelete={(e) => setDeleting(e)}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        actions={{ save: saveExpenseCategoryAction, setActive: setExpenseCategoryActiveAction }}
        labels={{
          title: t("expenses.manageCategories"),
          description: t("expenses.categoriesHint"),
          add: t("expenses.addCategory"),
          placeholder: t("expenses.categoryNamePlaceholder"),
          saved: t("expenses.categorySaved"),
          activated: t("expenses.categoryActivated"),
          deactivated: t("expenses.categoryDeactivated"),
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("expenses.deleteExpense")}
        description={
          deleting
            ? t("expenses.deleteConfirm", { category: categoryLabel(deleting), amount: org.money(deleting.amountMinor), date: org.dateKey(deleting.dateKey) })
            : undefined
        }
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteExpenseAction({ id: deleting.id });
          if (res.ok) {
            toast.success(t("expenses.deleted"));
            setSheet({ open: false, expense: null });
          } else toast.error(te(res.error));
        }}
      />
    </PageContainer>
  );
}

function AttachmentLink({ expense }: { expense: ExpenseRow }) {
  const { t } = useI18n();
  if (!expense.attachment) return null;
  const a = expense.attachment;
  return a.url ? (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      title={a.name}
      aria-label={t("expenses.viewAttachment", { name: a.name })}
    >
      <PaperclipIcon className="size-4" />
    </a>
  ) : (
    <PaperclipIcon className="size-4 text-muted-foreground" aria-label={a.name} />
  );
}
