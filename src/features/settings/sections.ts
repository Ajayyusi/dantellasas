import { hasPermission, type Permission } from "@/lib/permissions";

export type SettingsSection =
  | "business"
  | "branches"
  | "users"
  | "roles"
  | "taxes"
  | "payments"
  | "appointments"
  | "notifications"
  | "receipts"
  | "appearance"
  | "language"
  | "data"
  | "audit";

export type SettingsGroup = "business" | "team" | "operations" | "preferences" | "system";

export interface SectionConfig {
  key: SettingsSection;
  href: string;
  group: SettingsGroup;
  /** null = any member (their own preferences). */
  permission: Permission | null;
}

export const SETTINGS_SECTIONS: SectionConfig[] = [
  { key: "business", href: "/settings/business", group: "business", permission: "manage_settings" },
  { key: "branches", href: "/settings/branches", group: "business", permission: "manage_settings" },
  { key: "taxes", href: "/settings/taxes", group: "business", permission: "manage_settings" },
  { key: "payments", href: "/settings/payments", group: "business", permission: "manage_settings" },
  { key: "receipts", href: "/settings/receipts", group: "business", permission: "manage_settings" },
  { key: "users", href: "/settings/users", group: "team", permission: "manage_users" },
  { key: "roles", href: "/settings/roles", group: "team", permission: "manage_users" },
  { key: "appointments", href: "/settings/appointments", group: "operations", permission: "manage_settings" },
  { key: "notifications", href: "/settings/notifications", group: "operations", permission: "manage_settings" },
  { key: "appearance", href: "/settings/appearance", group: "preferences", permission: "manage_settings" },
  { key: "language", href: "/settings/language", group: "preferences", permission: null },
  { key: "data", href: "/settings/data", group: "system", permission: "manage_settings" },
  { key: "audit", href: "/settings/audit-log", group: "system", permission: "view_audit_log" },
];

export function visibleSections(permissions: string[]): SectionConfig[] {
  return SETTINGS_SECTIONS.filter((s) => !s.permission || hasPermission(permissions, s.permission));
}
