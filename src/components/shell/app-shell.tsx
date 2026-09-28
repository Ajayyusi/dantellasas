"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { OrgProvider, type OrgClientContext } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { setSidebarCollapsedAction } from "@/lib/tenancy/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { CommandMenu } from "./command-menu";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export interface ShellOrgRef {
  id: string;
  name: string;
}

export function AppShell({
  org,
  orgs,
  initialCollapsed,
  children,
}: {
  org: OrgClientContext;
  orgs: ShellOrgRef[];
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    void setSidebarCollapsedAction(next);
  }

  return (
    <OrgProvider value={org}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md"
      >
        {t("nav.skipToContent")}
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 border-e bg-sidebar transition-[width] duration-200 ease-out lg:block no-print",
            collapsed ? "w-[68px]" : "w-60",
          )}
        >
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} orgs={orgs} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="start" className="w-72 bg-sidebar p-0" showClose={false}>
            <SheetTitle className="sr-only">{t("nav.openMenu")}</SheetTitle>
            <Sidebar collapsed={false} orgs={orgs} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenCommand={() => setCommandOpen(true)}
            leading={
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={t("nav.openMenu")}
              >
                <MenuIcon />
              </Button>
            }
          />
          <main id="main" className="flex-1 outline-none" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </OrgProvider>
  );
}
