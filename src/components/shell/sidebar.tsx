"use client";

import { CheckIcon, ChevronsUpDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useOrg } from "@/components/providers/org-provider";
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

import type { ShellOrgRef } from "./app-shell";
import { visibleNav } from "./nav-config";

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  orgs,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  orgs: ShellOrgRef[];
}) {
  const { t, dir } = useI18n();
  const org = useOrg();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sections = visibleNav(org.permissions);
  const displayName = org.settings.business.displayName || org.orgName;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border px-3", collapsed && "justify-center px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 text-start outline-none hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
                collapsed && "flex-none",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[12px] font-semibold text-primary-foreground">
                {initials(displayName)}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-tight">{displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{org.user.roleName}</span>
                  </span>
                  <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
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
                <span className="grid size-6 place-items-center rounded bg-muted text-[11px] font-semibold">
                  {initials(o.name)}
                </span>
                <span className="flex-1 truncate">{o.name}</span>
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

      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                {t(section.label)}
              </div>
            )}
            <ul className="grid gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground outline-none transition-colors",
                      "hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                      active && "bg-sidebar-accent text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary" />
                    )}
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!collapsed && <span className="truncate">{t(item.label)}</span>}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side={dir === "rtl" ? "left" : "right"}>{t(item.label)}</TooltipContent>
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

      {onToggle ? (
        <div className={cn("border-t border-sidebar-border p-2", collapsed && "flex justify-center")}>
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
        </div>
      ) : null}
    </div>
  );
}
