/**
 * Permission catalogue — the single source of truth, mirrored in
 * firestore.rules. Roles are editable per organization; these are only the
 * defaults seeded when an organization is created.
 */

export const PERMISSION_GROUPS = [
  { key: "dashboard", permissions: ["view_dashboard"] },
  {
    key: "appointments",
    permissions: [
      "view_appointments",
      "view_all_appointments",
      "create_appointments",
      "edit_appointments",
      "cancel_appointments",
    ],
  },
  { key: "customers", permissions: ["view_customers", "create_customers", "edit_customers"] },
  { key: "sales", permissions: ["view_sales", "create_sales", "refund_sales", "apply_discounts"] },
  { key: "reports", permissions: ["view_reports", "export_data", "view_commissions"] },
  { key: "expenses", permissions: ["view_expenses", "create_expenses"] },
  { key: "staff", permissions: ["view_staff", "manage_staff", "manage_attendance"] },
  { key: "catalog", permissions: ["manage_services", "manage_catalog", "manage_inventory"] },
  { key: "admin", permissions: ["manage_settings", "manage_users", "view_audit_log"] },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions as readonly Permission[],
);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export const SYSTEM_ROLE_KEYS = [
  "owner",
  "admin",
  "branch_manager",
  "receptionist",
  "cashier",
  "employee",
  "accountant",
] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];
export type RoleKey = SystemRoleKey | "custom";

const everything = ALL_PERMISSIONS;

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleKey, Permission[]> = {
  owner: everything,
  admin: everything,
  branch_manager: [
    "view_dashboard",
    "view_appointments",
    "view_all_appointments",
    "create_appointments",
    "edit_appointments",
    "cancel_appointments",
    "view_customers",
    "create_customers",
    "edit_customers",
    "view_sales",
    "create_sales",
    "refund_sales",
    "apply_discounts",
    "view_reports",
    "export_data",
    "view_commissions",
    "view_expenses",
    "create_expenses",
    "view_staff",
    "manage_staff",
    "manage_attendance",
    "manage_inventory",
    "manage_catalog",
  ],
  receptionist: [
    "view_dashboard",
    "view_appointments",
    "view_all_appointments",
    "create_appointments",
    "edit_appointments",
    "cancel_appointments",
    "view_customers",
    "create_customers",
    "edit_customers",
    "view_sales",
    "create_sales",
    "view_staff",
  ],
  cashier: [
    "view_appointments",
    "view_all_appointments",
    "view_customers",
    "create_customers",
    "view_sales",
    "create_sales",
    "apply_discounts",
  ],
  employee: ["view_appointments", "view_customers"],
  accountant: [
    "view_dashboard",
    "view_sales",
    "view_reports",
    "export_data",
    "view_commissions",
    "view_expenses",
    "create_expenses",
    "view_audit_log",
  ],
};

/** Roles whose members always see every branch. */
export const ORG_WIDE_ROLES: RoleKey[] = ["owner", "admin"];

export function hasPermission(
  permissions: readonly string[] | undefined,
  permission: Permission | Permission[],
): boolean {
  if (!permissions) return false;
  const list = Array.isArray(permission) ? permission : [permission];
  return list.every((p) => permissions.includes(p));
}

export function hasAnyPermission(
  permissions: readonly string[] | undefined,
  list: Permission[],
): boolean {
  if (!permissions) return false;
  return list.some((p) => permissions.includes(p));
}
