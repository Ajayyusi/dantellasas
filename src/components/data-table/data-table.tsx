"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { downloadCsv, type CsvColumn } from "./csv";

export interface FacetFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** Returns true when the row matches the selected value. */
  match: (row: T, value: string) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Text used by the search box; omit to hide search. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  facets?: FacetFilter<T>[];
  initialSort?: SortingState;
  /** Columns hidden until the user shows them, e.g. { status: false }. */
  initialVisibility?: VisibilityState;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  /** Enables checkboxes; the render prop gets the selected rows. */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode;
  csv?: { filename: string; columns: CsvColumn<T>[] };
  toolbar?: React.ReactNode;
  empty?: React.ReactNode;
  /** Card layout used below the `lg` breakpoint (phones and portrait tablets). */
  mobileCard?: (row: T) => React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

/**
 * The product's table. Client-side search/filter/sort/pagination over the rows
 * the server already scoped and authorised; server components decide which
 * rows exist, this decides how they're browsed.
 */
// Stable defaults: a fresh [] each render re-filters rows and loops page-index resets.
const NO_FACETS: FacetFilter<never>[] = [];
const NO_SORT: SortingState = [];

export function DataTable<T>({
  data,
  columns,
  searchText,
  searchPlaceholder,
  facets = NO_FACETS as FacetFilter<T>[],
  initialSort = NO_SORT,
  initialVisibility = {},
  pageSize = 25,
  onRowClick,
  getRowId,
  bulkActions,
  csv,
  toolbar,
  empty,
  mobileCard,
  className,
  footer,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [facetValues, setFacetValues] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [visibility, setVisibility] = useState<VisibilityState>(initialVisibility);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (q && searchText && !searchText(row).toLowerCase().includes(q)) return false;
      for (const f of facets) {
        const v = facetValues[f.id];
        if (v && v !== "__all" && !f.match(row, v)) return false;
      }
      return true;
    });
  }, [data, query, searchText, facets, facetValues]);

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!bulkActions) return columns;
    return [
      {
        id: "__select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label={t("common.select")}
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={t("common.select")}
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 32,
      },
      ...columns,
    ];
  }, [columns, bulkActions, t]);

  // TanStack Table returns non-memoizable functions by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns: allColumns,
    state: { sorting, columnVisibility: visibility, rowSelection: selection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    enableRowSelection: !!bulkActions,
    autoResetPageIndex: true,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const hasFilters = query.length > 0 || Object.values(facetValues).some((v) => v && v !== "__all");
  const { pageIndex } = table.getState().pagination;
  const total = filtered.length;
  const size = table.getState().pagination.pageSize;
  const from = total === 0 ? 0 : pageIndex * size + 1;
  const to = Math.min(total, (pageIndex + 1) * size);
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && typeof c.columnDef.header === "string");

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3.5 sm:px-5">
        {searchText ? (
          <div className="relative min-w-0 flex-1 basis-full sm:max-w-xs sm:basis-auto">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
              className="ps-9"
              aria-label={t("common.search")}
            />
          </div>
        ) : null}
        {facets.map((f) => (
          <Select
            key={f.id}
            value={facetValues[f.id] ?? "__all"}
            onValueChange={(v) => setFacetValues((s) => ({ ...s, [f.id]: v }))}
          >
            <SelectTrigger
              className={cn(
                "w-auto min-w-36",
                facetValues[f.id] && facetValues[f.id] !== "__all" && "border-primary/35 bg-primary-soft font-semibold text-primary",
              )}
              aria-label={f.label}
            >
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">
                {f.label}: {t("common.all")}
              </SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setFacetValues({});
            }}
          >
            <XIcon />
            {t("common.clearFilters")}
          </Button>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          {toolbar}
          {csv ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(csv.filename, csv.columns, table.getSortedRowModel().rows.map((r) => r.original))}
            >
              <DownloadIcon />
              <span className="hidden sm:inline">{t("common.export")}</span>
            </Button>
          ) : null}
          {hideable.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={t("common.columns")} className={cn("hidden", mobileCard ? "lg:inline-flex" : "md:inline-flex")}>
                  <Settings2Icon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("common.columns")}</DropdownMenuLabel>
                {hideable.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {String(c.columnDef.header)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {bulkActions && selectedRows.length > 0 ? (
        <div className="flex animate-fade-up flex-wrap items-center gap-2 border-b bg-primary-soft/70 px-5 py-2.5 text-[15px]">
          <span className="font-semibold text-primary">{t("common.selected", { count: selectedRows.length })}</span>
          <div className="ms-auto flex items-center gap-2">{bulkActions(selectedRows, () => setSelection({}))}</div>
        </div>
      ) : null}

      {total === 0 ? (
        hasFilters ? (
          <EmptyState compact icon={SearchIcon} title={t("common.noResults")} description={t("common.noResultsHint")} />
        ) : (
          (empty ?? <EmptyState compact title={t("common.noResults")} />)
        )
      ) : (
        <>
          {mobileCard ? (
            <ul className="divide-y lg:hidden">
              {table.getRowModel().rows.map((row) => (
                <li key={row.id}>
                  {onRowClick ? (
                    <button
                      type="button"
                      className="block w-full px-4 py-3.5 text-start outline-none transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50"
                      onClick={() => onRowClick(row.original)}
                    >
                      {mobileCard(row.original)}
                    </button>
                  ) : (
                    <div className="px-4 py-3.5">{mobileCard(row.original)}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <div className={cn(mobileCard && "hidden lg:block")}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const meta = header.column.columnDef.meta as { align?: "end" } | undefined;
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(meta?.align === "end" && "text-end")}
                          style={header.column.columnDef.size && header.id === "__select" ? { width: 44 } : undefined}
                          aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded uppercase outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                                meta?.align === "end" && "flex-row-reverse",
                                sorted && "text-primary",
                              )}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === "asc" ? (
                                <ArrowUpIcon className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ArrowDownIcon className="size-3.5" />
                              ) : (
                                <ArrowUpDownIcon className="size-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter") onRowClick(row.original);
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { align?: "end" } | undefined;
                      return (
                        <TableCell key={cell.id} className={cn(meta?.align === "end" && "text-end tabular")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {footer}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-4 py-3 text-[14px] text-muted-foreground sm:px-5">
            <span className="tabular">{t("common.showing", { from, to, total })}</span>
            <div className="flex items-center gap-2">
              <Select value={String(size)} onValueChange={(v) => table.setPageSize(Number(v))}>
                <SelectTrigger size="sm" className="w-20" aria-label={t("common.rowsPerPage")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label={t("common.previous")}
              >
                <ChevronLeftIcon className="rtl-flip" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label={t("common.next")}
              >
                <ChevronRightIcon className="rtl-flip" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
