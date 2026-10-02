"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import { useI18n } from "@/lib/i18n/client";
import { formatDate, formatDateKey, type DateStyle } from "@/lib/i18n/format";
import { formatMoney } from "@/lib/money";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { OrgSettings } from "@/lib/settings";
import type { BranchDTO } from "@/lib/types";

/**
 * Client view of the tenant context: settings, branches and permissions for
 * rendering. Purely a UI convenience — every action re-checks on the server.
 */
export interface OrgClientContext {
  orgId: string;
  orgName: string;
  settings: OrgSettings;
  branches: BranchDTO[];
  branchId: string | null;
  permissions: string[];
  staffId: string | null;
  user: { uid: string; name: string; email: string; roleName: string; roleKey: string; platformAdmin: boolean };
}

interface OrgValue extends OrgClientContext {
  can: (p: Permission | Permission[]) => boolean;
  money: (minor: number, opts?: { compact?: boolean }) => string;
  date: (value: string | Date | null | undefined, style?: DateStyle) => string;
  dateKey: (key: string, style?: DateStyle) => string;
  timezone: string;
  currency: string;
  branchName: (id: string | null | undefined) => string;
}

const OrgContext = createContext<OrgValue | null>(null);

export function OrgProvider({ value, children }: { value: OrgClientContext; children: React.ReactNode }) {
  const { locale } = useI18n();
  const tz = value.settings.locale.timezone;
  const currency = value.settings.locale.currency;
  const can = useCallback((p: Permission | Permission[]) => hasPermission(value.permissions, p), [value.permissions]);
  const ctx = useMemo<OrgValue>(
    () => ({
      ...value,
      can,
      timezone: tz,
      currency,
      money: (minor, opts) => formatMoney(minor, currency, locale, opts),
      date: (v, style) => formatDate(v, locale, tz, style),
      dateKey: (k, style) => formatDateKey(k, locale, style),
      branchName: (id) => value.branches.find((b) => b.id === id)?.name ?? "—",
    }),
    [value, can, tz, currency, locale],
  );
  return <OrgContext.Provider value={ctx}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within <OrgProvider>");
  return ctx;
}
