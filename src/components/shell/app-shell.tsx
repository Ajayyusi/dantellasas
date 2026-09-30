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
import { MobileNav } from "./mobile-nav";
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
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:shadow-md"
      >
        {t("nav.skipToContent")}
      </a>
      <div className="flex min-h-dvh">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 border-e border-sidebar-border transition-[width] duration-300 ease-[var(--ease-out)] lg:block no-print",
            collapsed ? "w-[76px]" : "w-[248px]",
          )}
        >
          <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} orgs={orgs} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="start" className="w-[288px] border-sidebar-border p-0" showClose={false}>
            <SheetTitle className="sr-only">{t("nav.openMenu")}</SheetTitle>
            <Sidebar collapsed={false} orgs={orgs} scope="mobile" onNavigate={() => setMobileOpen(false)} />
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
          <main id="main" className="flex-1 pb-24 outline-none lg:pb-0" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
      <MobileNav onMore={() => setMobileOpen(true)} />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </OrgProvider>
  );
}
