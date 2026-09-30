"use client";

import { CheckIcon, ChevronsUpDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { BrandEmblem, BrandMark } from "@/components/brand-mark";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import { setOrganizationAction } from "@/lib/tenancy/actions";
import { cn, initials } from "@/lib/utils";

import { AccountMenu, useRoleLabel } from "./account-menu";
import type { ShellOrgRef } from "./app-shell";
import { isActiveHref, visibleNav } from "./nav-config";

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  orgs,
  scope = "desktop",
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  orgs: ShellOrgRef[];
  /** Keeps the animated active marker separate for the desktop and mobile copies. */
  scope?: "desktop" | "mobile";
}) {
  const { t, dir } = useI18n();
  const org = useOrg();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sections = visibleNav(org.permissions);
  const displayName = org.settings.business.displayName || org.orgName;
  const roleLabel = useRoleLabel();
  const userName = org.user.name || org.user.email;
  const tipSide = dir === "rtl" ? "left" : "right";

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={cn("flex h-16 shrink-0 items-center px-5", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" onClick={onNavigate} className="rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {collapsed ? <BrandEmblem className="size-9" /> : <BrandMark tagline={t("shell.brandTagline")} />}
        </Link>
      </div>

      <div className={cn("px-3 pb-2", collapsed && "flex justify-center px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("shell.organization")}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-xl border border-sidebar-border bg-card p-2 text-start outline-none transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring",
                collapsed ? "size-11 justify-center p-0" : "w-full",
              )}
            >
              {org.settings.business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tenant logo served from Storage
                <img src={org.settings.business.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-[12px] font-bold text-foreground/80">
                  {initials(displayName)}
                </span>
              )}
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight rtl:text-right" dir="auto">{displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{org.branchId ? org.branchName(org.branchId) : t("common.allBranches")}</span>
                  </span>
                  <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>{t("shell.organization")}</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onSelect={() =>
                  o.id !== org.orgId &&
                  startTransition(async () => {
                    const res = await setOrganizationAction(o.id);
                    if (res.ok) router.refresh();
                  })
                }
              >
                <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-[12px] font-semibold text-primary">
                  {initials(o.name)}
                </span>
                <span className="flex-1 truncate rtl:text-right" dir="auto">{o.name}</span>
                {o.id === org.orgId ? <CheckIcon className="!text-primary" /> : null}
              </DropdownMenuItem>
            ))}
            {org.can("manage_settings") ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t("nav.settings")}</Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            {collapsed ? (
              <div aria-hidden className="mx-auto mb-2 h-px w-8 bg-sidebar-border" />
            ) : (
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t(section.label)}</div>
            )}
            <ul className="grid gap-0.5">
              {section.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-sidebar-foreground outline-none transition-colors duration-150",
                      "hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                      active && "font-semibold text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`${scope}-nav-active`}
                        aria-hidden
                        className="absolute inset-0 rounded-lg bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.9 }}
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "relative size-[18px] shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                      strokeWidth={1.8}
                    />
                    {!collapsed && <span className="relative truncate">{t(item.label)}</span>}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side={tipSide}>{t(item.label)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("grid gap-1.5 border-t border-sidebar-border p-3", collapsed && "justify-items-center")}>
        <AccountMenu align="start" side="top">
          <button
            type="button"
            aria-label={t("shell.account")}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-lg p-2 text-start outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
              collapsed ? "justify-center" : "w-full",
            )}
          >
            <PersonAvatar name={userName} className="size-8 text-[12px]" />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight rtl:text-right" dir="auto">{userName}</span>
                <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
              </span>
            )}
          </button>
        </AccountMenu>
        {onToggle ? (
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={onToggle}
            className={cn("text-muted-foreground", !collapsed && "w-full justify-start")}
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            {collapsed ? <PanelLeftOpenIcon className="rtl-flip" /> : <PanelLeftCloseIcon className="rtl-flip" />}
            {!collapsed && t("nav.collapse")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
