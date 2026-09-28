import {
  BarChart3Icon,
  BoxesIcon,
  CalendarDaysIcon,
  GiftIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  ReceiptIcon,
  ScissorsIcon,
  SettingsIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import type { TKey } from "@/lib/i18n/messages";
import { hasAnyPermission, type Permission } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: TKey;
  icon: LucideIcon;
  /** Shown if the member has ANY of these. */
  anyOf: Permission[];
}

export interface NavSection {
  label: TKey;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    label: "nav.sections.overview",
    items: [{ href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboardIcon, anyOf: ["view_dashboard"] }],
  },
  {
    label: "nav.sections.frontDesk",
    items: [
      { href: "/appointments", label: "nav.appointments", icon: CalendarDaysIcon, anyOf: ["view_appointments"] },
      { href: "/pos", label: "nav.checkout", icon: ShoppingBagIcon, anyOf: ["create_sales"] },
      { href: "/clients", label: "nav.clients", icon: UsersIcon, anyOf: ["view_customers"] },
    ],
  },
  {
    label: "nav.sections.business",
    items: [
      { href: "/sales", label: "nav.sales", icon: ReceiptIcon, anyOf: ["view_sales"] },
      { href: "/staff", label: "nav.staff", icon: UserRoundIcon, anyOf: ["view_staff"] },
      { href: "/services", label: "nav.services", icon: ScissorsIcon, anyOf: ["manage_services"] },
      { href: "/catalog", label: "nav.catalog", icon: GiftIcon, anyOf: ["manage_catalog"] },
      { href: "/inventory", label: "nav.inventory", icon: BoxesIcon, anyOf: ["manage_inventory"] },
      { href: "/expenses", label: "nav.expenses", icon: WalletIcon, anyOf: ["view_expenses"] },
    ],
  },
  {
    label: "nav.sections.growth",
    items: [
      { href: "/reports", label: "nav.reports", icon: BarChart3Icon, anyOf: ["view_reports"] },
      { href: "/marketing", label: "nav.marketing", icon: MegaphoneIcon, anyOf: ["manage_catalog", "view_customers"] },
    ],
  },
  {
    label: "nav.sections.admin",
    items: [
      {
        href: "/settings",
        label: "nav.settings",
        icon: SettingsIcon,
        anyOf: ["manage_settings", "manage_users", "view_audit_log"],
      },
    ],
  },
];

export function visibleNav(permissions: string[]): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => hasAnyPermission(permissions, i.anyOf)) })).filter(
    (s) => s.items.length > 0,
  );
}
