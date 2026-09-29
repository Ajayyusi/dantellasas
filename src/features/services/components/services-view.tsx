"use client";

import {
  ClockIcon,
  CopyIcon,
  FolderPlusIcon,
  GlobeIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  ScissorsIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { SortableList } from "@/components/common/sortable-list";
import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useLocalPreference } from "@/hooks/use-browser";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import { localName } from "@/lib/localize";
import { normalizeText } from "@/lib/search";
import type { ServiceCategoryDTO, ServiceDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  deleteCategoryAction,
  duplicateServiceAction,
  reorderCategoriesAction,
  reorderServicesAction,
  setServiceActiveAction,
} from "../actions";
import { CategoryDialog } from "./category-dialog";
import { ServiceFormSheet, type StaffOption } from "./service-form-sheet";

const UNCATEGORIZED = "__none";
const VIEWS = ["list", "cards"] as const;

export function ServicesView({
  categories: initialCategories,
  services: initialServices,
  staff,
}: {
  categories: ServiceCategoryDTO[];
  services: ServiceDTO[];
  staff: StaffOption[];
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const [categories, setCategories] = useState(initialCategories);
  const [services, setServices] = useState(initialServices);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newInCategory, setNewInCategory] = useState("");
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: ServiceCategoryDTO | null }>({
    open: false,
    category: null,
  });
  const [deleting, setDeleting] = useState<ServiceCategoryDTO | null>(null);
  const [view, setView] = useLocalPreference("dc-services-view", VIEWS, "list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [synced, setSynced] = useState({ initialCategories, initialServices });
  if (synced.initialCategories !== initialCategories || synced.initialServices !== initialServices) {
    // Fresh server data after a mutation replaces the optimistic copy.
    setSynced({ initialCategories, initialServices });
    setCategories(initialCategories);
    setServices(initialServices);
  }

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const q = normalizeText(query);
  const visible = q
    ? services.filter((s) => normalizeText(`${s.name} ${s.nameAr}`).includes(q))
    : services;

  const groups = [
    ...categories.map((c) => ({ category: c, items: visible.filter((s) => s.categoryId === c.id) })),
    {
      category: null as ServiceCategoryDTO | null,
      items: visible.filter((s) => !s.categoryId || !categories.some((c) => c.id === s.categoryId)),
    },
  ]
    .filter((g) => g.category !== null || g.items.length > 0)
    .filter((g) => categoryFilter === "all" || (g.category?.id ?? UNCATEGORIZED) === categoryFilter);

  function openNew(categoryId = "") {
    setEditing(null);
    setNewInCategory(categoryId);
    setSheetOpen(true);
  }

  async function reorderServices(categoryKey: string, ids: string[]) {
    const inGroup = new Set(ids);
    const others = services.filter((s) => !inGroup.has(s.id));
    const reordered = ids.map((id) => services.find((s) => s.id === id)!).filter(Boolean);
    // Keep global order stable: other groups first by existing order, then this group in new order.
    const next = [...others, ...reordered].map((s) =>
      inGroup.has(s.id) ? { ...s, sortOrder: ids.indexOf(s.id) } : s,
    );
    setServices(next.sort((a, b) => a.sortOrder - b.sortOrder));
    void categoryKey;
    const res = await reorderServicesAction({ ids });
    if (!res.ok) toast.error(te(res.error));
  }

  async function reorderCategories(ids: string[]) {
    setCategories(ids.map((id, i) => ({ ...categories.find((c) => c.id === id)!, sortOrder: i })));
    const res = await reorderCategoriesAction({ ids });
    if (!res.ok) toast.error(te(res.error));
  }

  async function toggleActive(s: ServiceDTO, active: boolean) {
    setServices((list) => list.map((x) => (x.id === s.id ? { ...x, active } : x)));
    const res = await setServiceActiveAction({ id: s.id, active });
    if (res.ok) toast.success(active ? t("services.activated") : t("services.deactivated"));
    else {
      toast.error(te(res.error));
      setServices((list) => list.map((x) => (x.id === s.id ? { ...x, active: !active } : x)));
    }
  }

  async function duplicate(s: ServiceDTO) {
    const res = await duplicateServiceAction({ id: s.id, name: t("services.copyOf", { name: s.name }) });
    if (res.ok) toast.success(t("services.duplicated"));
    else toast.error(te(res.error));
  }

  const staffSummary = (s: ServiceDTO) => {
    if (s.staffIds.length === 0) return <span className="text-muted-foreground">{t("services.allStaff")}</span>;
    const people = s.staffIds.map((id) => staffById.get(id)).filter((x): x is StaffOption => !!x);
    return (
      <span className="flex items-center gap-2">
        <span className="flex -space-x-1.5 rtl:space-x-reverse">
          {people.slice(0, 4).map((p) => (
            <PersonAvatar key={p.id} name={p.displayName} src={p.photoUrl} color={p.color} className="size-6 text-[11px] ring-2 ring-card" />
          ))}
        </span>
        <span className="text-muted-foreground">{t("services.staffCount", { count: people.length })}</span>
      </span>
    );
  };

  const edit = (s: ServiceDTO) => {
    setEditing(s);
    setSheetOpen(true);
  };

  const menu = (s: ServiceDTO) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => edit(s)}>
          <PencilIcon />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => duplicate(s)}>
          <CopyIcon />
          {t("services.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toggleActive(s, !s.active)}>
          <PowerIcon />
          {s.active ? t("services.archiveService") : t("services.activateService")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const card = (s: ServiceDTO, color: string) => (
    <article
      key={s.id}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        !s.active && "opacity-60",
      )}
    >
      <span aria-hidden className="h-1" style={{ backgroundColor: color }} />
      <span
        aria-hidden
        className="pointer-events-none absolute -end-10 -top-10 size-28 rounded-full opacity-[0.09] transition-opacity group-hover:opacity-[0.16]"
        style={{ backgroundColor: color }}
      />
      <button
        type="button"
        onClick={() => edit(s)}
        className="relative flex flex-1 flex-col gap-1.5 p-5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="line-clamp-2 text-base font-semibold leading-snug">{localName(s, locale)}</span>
        {s.description ? <span className="line-clamp-2 text-[14px] text-muted-foreground">{s.description}</span> : null}
        <span className="mt-auto flex items-end justify-between gap-3 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
            <ClockIcon className="size-3.5" />
            {formatDuration(s.durationMin, locale)}
          </span>
          <span className="font-display text-[24px] font-semibold leading-none tabular">{org.money(s.priceMinor)}</span>
        </span>
      </button>
      <div className="relative flex items-center gap-2 border-t bg-muted/25 px-4 py-2.5 text-[13px]">
        <span className="min-w-0 flex-1 truncate">{staffSummary(s)}</span>
        {s.onlineBookable ? (
          <span className="text-primary" title={t("services.onlineBookable")}>
            <GlobeIcon className="size-4" aria-label={t("services.onlineBookable")} />
          </span>
        ) : null}
        <Switch checked={s.active} onCheckedChange={(v) => toggleActive(s, v)} aria-label={t("services.active")} />
        {menu(s)}
      </div>
    </article>
  );

  const row = (s: ServiceDTO, handle: React.ReactNode) => (
    <div className={cn("group flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-primary-soft/40 sm:px-5", !s.active && "opacity-60")}>
      {handle}
      <button type="button" onClick={() => edit(s)} className="min-w-0 flex-1 text-start outline-none focus-visible:underline">
        <span className="block truncate text-[15px] font-semibold">{localName(s, locale)}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[14px] text-muted-foreground sm:hidden">
          {formatDuration(s.durationMin, locale)} · {org.money(s.priceMinor)}
        </span>
      </button>
      <div className="hidden w-52 text-[14px] lg:block">{staffSummary(s)}</div>
      <div className="hidden w-20 text-end text-[15px] tabular text-muted-foreground sm:block">{formatDuration(s.durationMin, locale)}</div>
      <div className="hidden w-28 text-end text-[15px] font-semibold tabular sm:block">{org.money(s.priceMinor)}</div>
      <Switch checked={s.active} onCheckedChange={(v) => toggleActive(s, v)} aria-label={t("services.active")} />
      {menu(s)}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("services.title")}
        description={t("services.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: true, category: null })}>
              <FolderPlusIcon />
              {t("services.addCategory")}
            </Button>
            <Button onClick={() => openNew()}>
              <PlusIcon />
              {t("services.addService")}
            </Button>
          </>
        }
      />

      {services.length === 0 && categories.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-sm">
          <EmptyState
            icon={ScissorsIcon}
            title={t("services.empty")}
            description={t("services.emptyHint")}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCategoryDialog({ open: true, category: null })}>
                  {t("services.addCategory")}
                </Button>
                <Button onClick={() => openNew()}>{t("services.addService")}</Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 grid gap-1">
              <div className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("services.categories")}</div>
              <SortableList
                items={categories}
                onReorder={reorderCategories}
                className="grid gap-0.5"
                render={(c, handle) => (
                  <div className="group flex items-center gap-1 rounded-xl pe-2 transition-colors hover:bg-primary-soft/60">
                    {handle}
                    <a
                      href={`#cat-${c.id}`}
                      onClick={() => setCategoryFilter("all")}
                      className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-[15px] font-medium"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{localName(c, locale)}</span>
                      <span className="ms-auto text-[13px] tabular text-muted-foreground">
                        {services.filter((s) => s.categoryId === c.id).length}
                      </span>
                    </a>
                  </div>
                )}
              />
            </div>
          </aside>

          <div className="grid min-w-0 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("services.searchPlaceholder")}
                  className="ps-9"
                  aria-label={t("common.search")}
                />
              </div>
              <Segmented value={view} onValueChange={(v) => setView(v as (typeof VIEWS)[number])} aria-label={t("services.view.label")} className="ms-auto">
                <SegmentedItem value="list" aria-label={t("services.view.list")}>
                  <ListIcon className="size-4" />
                  <span className="hidden sm:inline">{t("services.view.list")}</span>
                </SegmentedItem>
                <SegmentedItem value="cards" aria-label={t("services.view.cards")}>
                  <LayoutGridIcon className="size-4" />
                  <span className="hidden sm:inline">{t("services.view.cards")}</span>
                </SegmentedItem>
              </Segmented>
            </div>

            {categories.length > 0 ? (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin lg:hidden">
                {[{ id: "all", name: t("services.allCategories"), nameAr: t("services.allCategories"), color: "" }, ...categories].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    aria-pressed={categoryFilter === c.id}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors",
                      categoryFilter === c.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-foreground/80 hover:border-primary/30 hover:bg-primary-soft",
                    )}
                  >
                    {c.color ? <span className="size-2.5 rounded-full ring-2 ring-card/70" style={{ backgroundColor: c.color }} /> : null}
                    {c.id === "all" ? c.name : localName(c, locale)}
                  </button>
                ))}
              </div>
            ) : null}

            {groups.map(({ category, items }) => {
              const key = category?.id ?? UNCATEGORIZED;
              const color = category?.color ?? "var(--muted-foreground)";
              const cards = view === "cards";
              return (
                <section
                  key={key}
                  id={`cat-${key}`}
                  className={cn("scroll-mt-20", !cards && "overflow-hidden rounded-2xl border bg-card shadow-sm")}
                >
                  <header className={cn("flex items-center gap-3", cards ? "mb-3 px-1" : "border-b bg-muted/30 px-4 py-3 sm:px-5")}>
                    <span className="size-3 rounded-full ring-4 ring-card" style={{ backgroundColor: color }} />
                    <h2 className={cn("font-semibold", cards ? "font-display text-[24px]" : "text-base")}>
                      {category ? localName(category, locale) : t("services.uncategorized")}
                    </h2>
                    <Badge variant="neutral">{items.length}</Badge>
                    <div className="ms-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openNew(category?.id ?? "")}>
                        <PlusIcon />
                        <span className="hidden sm:inline">{t("common.add")}</span>
                      </Button>
                      {category ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setCategoryDialog({ open: true, category })}>
                              <PencilIcon />
                              {t("services.editCategory")}
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive onSelect={() => setDeleting(category)}>
                              <Trash2Icon />
                              {t("services.deleteCategory")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </header>
                  {items.length === 0 ? (
                    <p className={cn("px-4 py-6 text-center text-[15px] text-muted-foreground", cards && "rounded-2xl border border-dashed bg-card/60")}>
                      {q ? t("common.noResults") : t("services.emptyCategory")}
                    </p>
                  ) : cards ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((s) => card(s, color))}</div>
                  ) : (
                    <SortableList
                      items={items}
                      disabled={!!q}
                      onReorder={(ids) => reorderServices(key, ids)}
                      className="divide-y"
                      render={(s, handle) => row(s, handle)}
                    />
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      <ServiceFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        service={editing}
        defaultCategoryId={newInCategory}
        categories={categories}
        staff={staff}
      />
      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((s) => ({ ...s, open }))}
        category={categoryDialog.category}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("services.deleteCategory")}
        description={deleting ? t("services.deleteCategoryConfirm", { name: deleting.name }) : undefined}
        destructive
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCategoryAction({ id: deleting.id });
          if (res.ok) toast.success(t("common.deleted"));
          else toast.error(te(res.error));
        }}
      />
    </PageContainer>
  );
}
