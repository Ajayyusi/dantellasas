"use client";

import { CalendarPlusIcon, MenuIcon, PlusIcon, ShoppingBagIcon, UserPlusIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useOrg } from "@/components/providers/org-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { isActiveHref, MOBILE_TABS, visibleNav } from "./nav-config";

/**
 * Floating tab bar for phones and small tablets: two tabs, a centre "+" for
 * the quick actions (book, sell, add a client), two tabs; "More" opens the
 * full menu.
 */
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
  const quick = [
    org.can("create_appointments") ? { href: "/appointments?new=1", label: t("shell.newAppointment"), icon: CalendarPlusIcon } : null,
    org.can("create_sales") ? { href: "/pos", label: t("shell.newSale"), icon: ShoppingBagIcon } : null,
    org.can("create_customers") ? { href: "/clients?new=1", label: t("shell.newClient"), icon: UserPlusIcon } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);
  const middle = Math.ceil(tabs.length / 2);

  const cell =
    "relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring";

  const tabLink = (tab: (typeof tabs)[number]) => {
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
        <Icon className="relative size-5" strokeWidth={1.8} />
        <span className="relative max-w-full truncate px-1">{t(tab.short)}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur-md lg:hidden no-print"
    >
      {tabs.slice(0, middle).map(tabLink)}
      {quick.length > 0 ? (
        <div className="flex shrink-0 items-center justify-center px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("shell.quickActions")}
                className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md outline-none transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <PlusIcon className="size-[22px]" strokeWidth={2.2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-56">
              <DropdownMenuLabel>{t("shell.quickActions")}</DropdownMenuLabel>
              {quick.map((q) => (
                <DropdownMenuItem key={q.href} asChild>
                  <Link href={q.href}>
                    <q.icon />
                    {q.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      {tabs.slice(middle).map(tabLink)}
      <button type="button" onClick={onMore} className={cn(cell, !onTab ? "text-primary" : "text-muted-foreground")}>
        {!onTab ? <span aria-hidden className="absolute inset-0 rounded-xl bg-primary-soft" /> : null}
        <MenuIcon className="relative size-5" strokeWidth={1.8} />
        <span className="relative">{t("nav.short.more")}</span>
      </button>
    </nav>
  );
}
