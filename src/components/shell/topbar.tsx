"use client";

import {
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMac } from "@/hooks/use-browser";
import { ALL_BRANCHES } from "@/lib/cookies";
import { todayKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { setBranchAction } from "@/lib/tenancy/actions";

import { AccountMenu } from "./account-menu";
import { LanguageSwitcher } from "./language-switcher";
import { activeNav, visibleNav } from "./nav-config";
import { NotificationsBell } from "./notifications-bell";

export function Topbar({ leading, onOpenCommand }: { leading?: React.ReactNode; onOpenCommand: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const isMac = useIsMac();
  const current = activeNav(visibleNav(org.permissions), pathname);

  function switchBranch(id: string) {
    startTransition(async () => {
      const res = await setBranchAction(id);
      if (res.ok) router.refresh();
    });
  }

  const branchLabel = org.branchId ? org.branchName(org.branchId) : t("common.allBranches");
  const canAppointment = org.can("create_appointments");
  const canSale = org.can("create_sales");
  const canClient = org.can("create_customers");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b bg-card/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 sm:px-6 no-print">
      {leading}

      {current ? (
        <div className="hidden min-w-0 shrink-0 items-center gap-2 text-[14px] 2xl:flex">
          <span className="text-muted-foreground">{t(current.section.label)}</span>
          <span aria-hidden className="text-muted-foreground/60">/</span>
          <span className="truncate font-semibold">{t(current.item.label)}</span>
          <span className="ms-1 text-muted-foreground">· {org.dateKey(todayKey(org.timezone), "weekdayDate")}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpenCommand}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-muted px-3 text-[14px] text-muted-foreground outline-none transition-colors hover:bg-[color-mix(in_oklch,var(--foreground)_7%,var(--muted))] focus-visible:outline-2 focus-visible:outline-ring sm:max-w-md 2xl:ms-6"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">
          <span className="hidden sm:inline">{t("shell.search")}</span>
          <span className="sm:hidden">{t("shell.searchShort")}</span>
        </span>
        <kbd className="ms-auto hidden shrink-0 whitespace-nowrap rounded-md border bg-card px-1.5 py-0.5 font-sans text-[12px] font-semibold text-muted-foreground lg:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="ms-auto flex items-center gap-1.5">
        {org.branches.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                className="hidden max-w-52 md:inline-flex"
                aria-label={t("shell.switchBranch")}
              >
                <MapPinIcon className="text-muted-foreground" />
                <span className="truncate">{branchLabel}</span>
                {org.branches.length > 1 ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : null}
              </Button>
            </DropdownMenuTrigger>
            {org.branches.length > 1 ? (
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>{t("shell.branch")}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => switchBranch(ALL_BRANCHES)}>
                  <span className="flex-1">{t("common.allBranches")}</span>
                  {org.branchId === null ? <CheckIcon className="!text-primary" /> : null}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {org.branches.map((b) => (
                  <DropdownMenuItem key={b.id} onSelect={() => switchBranch(b.id)}>
                    <span className="flex-1 truncate">{b.name}</span>
                    {org.branchId === b.id ? <CheckIcon className="!text-primary" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            ) : null}
          </DropdownMenu>
        ) : null}

        {canSale ? (
          <Button asChild variant="outline" size="sm" className="hidden xl:inline-flex">
            <Link href="/pos">
              <ShoppingBagIcon />
              {t("nav.checkout")}
            </Link>
          </Button>
        ) : null}

        {canAppointment ? (
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/appointments?new=1">
              <CalendarPlusIcon />
              <span className="hidden lg:inline">{t("shell.newAppointment")}</span>
            </Link>
          </Button>
        ) : null}

        {canAppointment || canSale || canClient ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="hidden lg:inline-flex" aria-label={t("shell.quickActions")}>
                <PlusIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("shell.quickActions")}</DropdownMenuLabel>
              {canAppointment ? (
                <DropdownMenuItem asChild>
                  <Link href="/appointments?new=1">
                    <CalendarPlusIcon />
                    {t("shell.newAppointment")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canSale ? (
                <DropdownMenuItem asChild>
                  <Link href="/pos">
                    <ShoppingBagIcon />
                    {t("shell.newSale")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canClient ? (
                <DropdownMenuItem asChild>
                  <Link href="/clients?new=1">
                    <UserPlusIcon />
                    {t("shell.newClient")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <LanguageSwitcher showLabel={false} />
        <NotificationsBell />

        <AccountMenu>
          <button
            type="button"
            className="ms-1 rounded-full outline-none transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={t("shell.account")}
          >
            <PersonAvatar name={org.user.name || org.user.email} className="size-9 text-[12px]" />
          </button>
        </AccountMenu>
      </div>
    </header>
  );
}
