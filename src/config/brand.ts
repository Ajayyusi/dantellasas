/**
 * Platform branding. This is the *product* name (the SaaS), not a tenant's
 * business name — tenants set their own name and logo in Settings › Business.
 * Rename the product by setting NEXT_PUBLIC_APP_NAME; nothing else hard-codes it.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Dantella CRM",
  shortName: (process.env.NEXT_PUBLIC_APP_NAME || "Dantella CRM").split(" ")[0] ?? "Dantella",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
} as const;
