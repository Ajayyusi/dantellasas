"use client";

import { GiftIcon, PackageIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { productDisplayName } from "@/features/inventory/types";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/i18n/format";
import { localName } from "@/lib/localize";
import { normalizeText } from "@/lib/search";
import { cn } from "@/lib/utils";

import type { PosCatalog } from "./pos-types";

export type CatalogPick =
  | { type: "service"; id: string }
  | { type: "product"; id: string }
  | { type: "package"; id: string }
  | { type: "membership"; id: string }
  | { type: "gift_card" };

type Tab = "services" | "products" | "packages" | "memberships" | "giftCards";

function Tile({
  title,
  meta,
  price,
  onClick,
  disabled,
  accent,
}: {
  title: string;
  meta?: string;
  price: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-xl border bg-card p-3.5 text-start outline-none transition-[box-shadow,border-color,transform] duration-150 hover:border-[color-mix(in_oklch,var(--primary)_35%,var(--border))] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        aria-hidden
        className="absolute end-2.5 top-2.5 grid size-6 scale-75 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
      >
        <PlusIcon className="size-3.5" />
      </span>
      <span className="relative line-clamp-2 pe-6 text-[15px] font-semibold leading-snug">{title}</span>
      <span className="relative mt-2.5 flex items-end justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
          {accent ? <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} /> : null}
          <span className="truncate">{meta}</span>
        </span>
        <span className="shrink-0 text-[15px] font-semibold tabular">{price}</span>
      </span>
    </button>
  );
}

export function CatalogPanel({ catalog, onPick }: { catalog: PosCatalog; onPick: (pick: CatalogPick) => void }) {
  const { t, locale } = useI18n();
  const org = useOrg();
  const [tab, setTab] = useState<Tab>("services");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const q = normalizeText(query);

  const services = useMemo(
    () =>
      catalog.services.filter(
        (s) => (category === "all" || s.categoryId === category) && (!q || normalizeText(`${s.name} ${s.nameAr}`).includes(q)),
      ),
    [catalog.services, category, q],
  );
  const products = useMemo(
    () => catalog.products.filter((p) => !q || normalizeText(`${p.brand} ${p.name} ${p.sku} ${p.barcode}`).includes(q)),
    [catalog.products, q],
  );
  const colorOf = (categoryId: string) => catalog.categories.find((c) => c.id === categoryId)?.color;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={tab} onValueChange={(v) => setTab(v as Tab)} aria-label={t("pos.catalog")} className="max-w-full overflow-x-auto">
          <SegmentedItem value="services">{t("pos.tabs.services")}</SegmentedItem>
          <SegmentedItem value="products">{t("pos.tabs.products")}</SegmentedItem>
          {catalog.packages.length ? <SegmentedItem value="packages">{t("pos.tabs.packages")}</SegmentedItem> : null}
          {catalog.plans.length ? <SegmentedItem value="memberships">{t("pos.tabs.memberships")}</SegmentedItem> : null}
          <SegmentedItem value="giftCards">{t("pos.tabs.giftCards")}</SegmentedItem>
        </Segmented>
        {tab === "services" || tab === "products" ? (
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("pos.search")} className="ps-9" aria-label={t("common.search")} />
          </div>
        ) : null}
      </div>

      {tab === "services" ? (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[{ id: "all", name: t("pos.allCategories"), nameAr: "", color: "" }, ...catalog.categories].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors",
                category === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground/80 hover:bg-muted",
              )}
            >
              {c.color ? <span className="size-2 rounded-full ring-2 ring-card/70" style={{ backgroundColor: c.color }} /> : null}
              {c.id === "all" ? c.name : localName(c, locale)}
            </button>
          ))}
        </div>
      ) : null}

      {/* auto-rows-max: in the height-limited grid, auto rows would shrink tiles and clip two-line names. */}
      <div className="grid min-h-0 auto-rows-max grid-cols-2 gap-2.5 overflow-y-auto p-0.5 pb-2 scrollbar-thin sm:grid-cols-3 2xl:grid-cols-4">
        {tab === "services" &&
          services.map((s) => (
            <Tile
              key={s.id}
              title={localName(s, locale)}
              meta={formatDuration(s.durationMin, locale)}
              price={org.money(s.priceMinor)}
              accent={colorOf(s.categoryId)}
              onClick={() => onPick({ type: "service", id: s.id })}
            />
          ))}
        {tab === "products" &&
          products.map((p) => (
            <Tile
              key={p.id}
              title={productDisplayName(p.brand, p.name)}
              meta={p.trackStock ? (p.stock > 0 ? t("pos.stock", { count: p.stock }) : t("pos.outOfStock")) : p.sku}
              price={org.money(p.priceMinor)}
              disabled={p.trackStock && p.stock <= 0}
              onClick={() => onPick({ type: "product", id: p.id })}
            />
          ))}
        {tab === "packages" &&
          catalog.packages.map((p) => (
            <Tile
              key={p.id}
              title={localName(p, locale)}
              meta={p.kind === "credit" ? t("pos.creditValue", { amount: org.money(p.creditMinor, { compact: true }) }) : t("pos.sessions", { count: p.items.reduce((s, i) => s + i.quantity, 0) })}
              price={org.money(p.priceMinor)}
              onClick={() => onPick({ type: "package", id: p.id })}
            />
          ))}
        {tab === "memberships" &&
          catalog.plans.map((p) => (
            <Tile key={p.id} title={localName(p, locale)} meta={t(`pos.periods.${p.period}`)} price={org.money(p.priceMinor)} onClick={() => onPick({ type: "membership", id: p.id })} />
          ))}
        {tab === "giftCards" ? (
          <button
            type="button"
            onClick={() => onPick({ type: "gift_card" })}
            className="col-span-full flex items-center gap-3.5 rounded-xl border border-dashed bg-card p-4 text-start transition-colors hover:bg-muted/60"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <GiftIcon className="size-5" />
            </span>
            <span className="text-[15px] font-semibold">{t("pos.addGiftCard")}</span>
          </button>
        ) : null}
        {tab === "services" && services.length === 0 ? (
          <p className="col-span-full py-12 text-center text-[15px] text-muted-foreground">
            <SparklesIcon className="mx-auto mb-2 size-6 text-muted-foreground" />
            {t("common.noResults")}
          </p>
        ) : null}
        {tab === "products" && products.length === 0 ? (
          <p className="col-span-full py-12 text-center text-[15px] text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 size-6 text-muted-foreground" />
            {t("common.noResults")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
