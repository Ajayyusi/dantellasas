"use client";

import { MenuIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { isActiveHref, MOBILE_TABS, visibleNav } from "./nav-config";

/** Floating tab bar for phones and small tablets; "More" opens the full menu. */
export function MobileNav({ onMore }: { onMore: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const pathname = usePathname();
  const items = visibleNav(org.permissions).flatMap((s) => s.items);
  const tabs = MOBILE_TABS.flatMap((tab) => {
    const item = items.find((i) => i.href === tab.href);
    return item ? [{ ...tab, icon: item.icon }] : [];
  });
  const onTab = tabs.some((tab) => isActiveHref(pathname, tab.href));

  const cell = "relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[12px] font-semibold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-md lg:hidden no-print"
    >
      {tabs.map((tab) => {
        const active = isActiveHref(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn(cell, active ? "text-primary" : "text-muted-foreground")}>
            {active ? (
              <motion.span
                layoutId="mobile-tab-active"
                aria-hidden
                className="absolute inset-0 rounded-xl bg-primary-soft"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            ) : null}
            <Icon className="relative size-5" strokeWidth={active ? 2 : 1.75} />
            <span className="relative max-w-full truncate px-1">{t(tab.short)}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn(cell, !onTab ? "text-primary" : "text-muted-foreground")}>
        {!onTab ? <span aria-hidden className="absolute inset-0 rounded-xl bg-primary-soft" /> : null}
        <MenuIcon className="relative size-5" strokeWidth={1.75} />
        <span className="relative">{t("nav.short.more")}</span>
      </button>
    </nav>
  );
}
