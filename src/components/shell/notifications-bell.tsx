"use client";

import { BellIcon, FileWarningIcon, PackageIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { getAlertsAction, type AlertItem } from "@/features/notifications/actions";
import { useI18n } from "@/lib/i18n/client";

export function NotificationsBell() {
  const { t } = useI18n();
  const org = useOrg();
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await getAlertsAction({});
    setAlerts(res.ok ? res.data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, org.branchId]);

  const count = alerts?.length ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label={t("shell.notifications")}>
          <BellIcon />
          {count > 0 ? (
            <span className="absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">{t("shell.notifications")}</div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {alerts === null ? (
            <div className="grid gap-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : alerts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("shell.noNotifications")}</p>
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-accent">
                    {a.kind === "low_stock" ? (
                      <PackageIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                    ) : (
                      <FileWarningIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">{a.title}</span>
                      <span className="block text-[13px] text-muted-foreground">
                        {a.kind === "low_stock"
                          ? t("alerts.lowStock", { qty: a.quantity ?? 0, min: a.minStock ?? 0, branch: org.branchName(a.branchId) })
                          : t(a.document === "visaExpiry" ? "alerts.visaExpiry" : "alerts.passportExpiry", {
                              date: org.dateKey(a.date ?? "", "date"),
                            })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
