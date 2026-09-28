"use client";

import {
  BellIcon,
  Building2Icon,
  CalendarClockIcon,
  CreditCardIcon,
  DatabaseIcon,
  HistoryIcon,
  LanguagesIcon,
  PaletteIcon,
  PercentIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  StoreIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { SETTINGS_SECTIONS, type SettingsGroup, type SettingsSection } from "../sections";

const ICONS: Record<SettingsSection, LucideIcon> = {
  business: StoreIcon,
  branches: Building2Icon,
  users: UsersIcon,
  roles: ShieldCheckIcon,
  taxes: PercentIcon,
  payments: CreditCardIcon,
  appointments: CalendarClockIcon,
  notifications: BellIcon,
  receipts: ReceiptTextIcon,
  appearance: PaletteIcon,
  language: LanguagesIcon,
  data: DatabaseIcon,
  audit: HistoryIcon,
};

const GROUPS: SettingsGroup[] = ["business", "team", "operations", "preferences", "system"];

/** Settings sub-navigation: a vertical list on desktop, a scrollable row on phones. */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const visible = SETTINGS_SECTIONS.filter((s) => sections.includes(s.key));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const chips = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Keep the current section's chip visible in the scrollable row on phones.
    const list = chips.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !el || list.offsetParent === null) return;
    // scrollIntoView handles RTL scroll direction; "nearest" avoids moving the page vertically.
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [pathname]);

  return (
    <nav aria-label={t("settings.navLabel")} className="min-w-0">
      {/* Phones and tablets: horizontally scrollable chips */}
      <ul ref={chips} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
        {visible.map((s) => {
          const Icon = ICONS[s.key];
          const active = isActive(s.href);
          return (
            <li key={s.key} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring",
                  active ? "border-primary/30 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {t(`settings.sections.${s.key}.title`)}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: grouped vertical list */}
      <div className="sticky top-20 hidden gap-4 lg:grid">
        {GROUPS.map((g) => {
          const items = visible.filter((s) => s.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="grid gap-0.5">
              <div className="px-2.5 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {t(`settings.groups.${g}`)}
              </div>
              {items.map((s) => {
                const Icon = ICONS[s.key];
                const active = isActive(s.href);
                return (
                  <Link
                    key={s.key}
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring",
                      active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
                    <span className="truncate">{t(`settings.sections.${s.key}.title`)}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
