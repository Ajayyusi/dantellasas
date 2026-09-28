"use client";

import { GiftIcon, PackageIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Input } from "@/components/ui/input";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
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
      className="group relative flex min-h-[84px] flex-col justify-between overflow-hidden rounded-lg border bg-card p-3 text-start shadow-sm outline-none transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {accent ? <span className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: accent }} /> : null}
      <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
      <span className="mt-2 flex items-end justify-between gap-2 text-[13px]">
        <span className="truncate text-muted-foreground">{meta}</span>
        <span className="shrink-0 font-semibold tabular">{price}</span>
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
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[{ id: "all", name: t("pos.allCategories"), nameAr: "", color: "" }, ...catalog.categories].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                category === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              {c.color ? <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} /> : null}
              {c.id === "all" ? c.name : localName(c, locale)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pb-2 scrollbar-thin sm:grid-cols-3 xl:grid-cols-4">
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
              title={`${p.brand} ${p.name}`.trim()}
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
            className="col-span-2 flex items-center gap-3 rounded-lg border border-dashed bg-card p-4 text-start hover:border-primary/50 hover:bg-accent sm:col-span-3 xl:col-span-4"
          >
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <GiftIcon className="size-5" />
            </span>
            <span className="text-sm font-medium">{t("pos.addGiftCard")}</span>
          </button>
        ) : null}
        {tab === "services" && services.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            <SparklesIcon className="mx-auto mb-2 size-5" />
            {t("common.noResults")}
          </p>
        ) : null}
        {tab === "products" && products.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            <PackageIcon className="mx-auto mb-2 size-5" />
            {t("common.noResults")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
