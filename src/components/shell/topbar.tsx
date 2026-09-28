"use client";

import {
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  SunIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutEverywhere } from "@/lib/auth/client";
import { ALL_BRANCHES } from "@/lib/cookies";
import { useI18n } from "@/lib/i18n/client";
import { setBranchAction } from "@/lib/tenancy/actions";

import { LanguageSwitcher } from "./language-switcher";
import { NotificationsBell } from "./notifications-bell";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function Topbar({ leading, onOpenCommand }: { leading?: React.ReactNode; onOpenCommand: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState<Theme>("system");
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    try {
      setTheme((localStorage.getItem("dc-theme") as Theme) || "system");
    } catch {
      /* storage unavailable */
    }
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  function changeTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem("dc-theme", next);
    } catch {
      /* storage unavailable */
    }
    applyTheme(next);
  }

  function switchBranch(id: string) {
    startTransition(async () => {
      const res = await setBranchAction(id);
      if (res.ok) router.refresh();
    });
  }

  const branchLabel = org.branchId ? org.branchName(org.branchId) : t("common.allBranches");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5 no-print">
      {leading}
      <button
        type="button"
        onClick={onOpenCommand}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:max-w-sm"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">
          <span className="hidden sm:inline">{t("shell.search")}</span>
          <span className="sm:hidden">{t("shell.searchShort")}</span>
        </span>
        <kbd className="ms-auto hidden rounded border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="ms-auto flex items-center gap-1">
        {org.branches.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={pending} className="max-w-48" aria-label={t("shell.switchBranch")}>
                <MapPinIcon className="text-muted-foreground" />
                <span className="hidden truncate md:inline">{branchLabel}</span>
                {org.branches.length > 1 ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : null}
              </Button>
            </DropdownMenuTrigger>
            {org.branches.length > 1 ? (
              <DropdownMenuContent align="end" className="w-56">
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

        {org.can("create_appointments") || org.can("create_sales") || org.can("create_customers") ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <PlusIcon />
                <span className="hidden sm:inline">{t("common.new")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {org.can("create_appointments") ? (
                <DropdownMenuItem asChild>
                  <Link href="/appointments?new=1">
                    <CalendarPlusIcon />
                    {t("shell.newAppointment")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {org.can("create_sales") ? (
                <DropdownMenuItem asChild>
                  <Link href="/pos">
                    <ShoppingBagIcon />
                    {t("shell.newSale")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {org.can("create_customers") ? (
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ms-1 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={t("shell.account")}
            >
              <PersonAvatar name={org.user.name || org.user.email} className="size-8" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-2">
              <div className="truncate text-sm font-medium">{org.user.name || org.user.email}</div>
              <div className="truncate text-xs text-muted-foreground">{org.user.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserIcon />
                {t("shell.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("shell.theme")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => changeTheme(v as Theme)}>
              <DropdownMenuRadioItem value="light">
                <SunIcon />
                {t("shell.themeLight")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <MoonIcon />
                {t("shell.themeDark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorIcon />
                {t("shell.themeSystem")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOutEverywhere();
                router.replace("/login");
                router.refresh();
              }}
            >
              <LogOutIcon />
              {t("shell.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
