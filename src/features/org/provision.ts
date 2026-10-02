import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db, orgCol, orgRef, userRef } from "@/lib/db";
import {
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  type SystemRoleKey,
} from "@/lib/permissions";
import { DEFAULT_SETTINGS, type Locale, type OrgSettings } from "@/lib/settings";

export const SYSTEM_ROLE_NAMES: Record<SystemRoleKey, { en: string; ar: string; description: string }> = {
  owner: { en: "Owner", ar: "المالك", description: "Full access, including billing and ownership." },
  admin: { en: "Admin", ar: "مسؤول", description: "Full access to every branch and setting." },
  branch_manager: {
    en: "Branch manager",
    ar: "مدير فرع",
    description: "Runs assigned branches: calendar, staff, sales, stock and reports.",
  },
  receptionist: {
    en: "Receptionist",
    ar: "موظف استقبال",
    description: "Books and manages appointments and clients; can take payments.",
  },
  cashier: { en: "Cashier", ar: "أمين صندوق", description: "Checks out clients and records sales." },
  employee: {
    en: "Employee",
    ar: "موظف",
    description: "Sees their own schedule and the clients they serve.",
  },
  accountant: {
    en: "Accountant",
    ar: "محاسب",
    description: "Sales, expenses, reports and exports. No front-desk actions.",
  },
};

const DEFAULT_EXPENSE_CATEGORIES = [
  ["Rent", "الإيجار"],
  ["Salaries", "الرواتب"],
  ["Utilities", "المرافق"],
  ["Supplies", "المستلزمات"],
  ["Marketing", "التسويق"],
  ["Maintenance", "الصيانة"],
  ["Other", "أخرى"],
] as const;

const DEFAULT_WEEK_HOURS = Object.fromEntries(
  ["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: true, start: "10:00", end: "22:00" }]),
);

function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "salon";
}

export interface ProvisionInput {
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  branchName: string;
  phone?: string;
  defaultLocale: Locale;
  /** Who created it, for the audit entry. Defaults to the owner (self sign-up). */
  actor?: { uid: string; name: string };
}

/**
 * Creates a tenant atomically: organization (with settings and trial
 * subscription), seven system roles, the owner's membership, the first
 * branch, default expense categories, the user → org index and an audit entry.
 */
export async function provisionOrganization(input: ProvisionInput) {
  const firestore = db();
  // Owners can run several businesses; keep the profile's original creation date.
  const userExists = (await userRef(input.ownerUid).get()).exists;
  const org = orgRef(firestore.collection("organizations").doc().id);
  const orgId = org.id;
  const branch = orgCol(orgId, "branches").doc();
  const now = FieldValue.serverTimestamp();
  const trialEndsAt = Timestamp.fromMillis(Date.now() + 30 * 86_400_000);

  const settings: OrgSettings = {
    ...DEFAULT_SETTINGS,
    business: {
      ...DEFAULT_SETTINGS.business,
      displayName: input.businessName,
      legalName: input.businessName,
      phone: input.phone ?? "",
      email: input.ownerEmail,
    },
    locale: { ...DEFAULT_SETTINGS.locale, defaultLocale: input.defaultLocale },
  };

  const batch = firestore.batch();
  batch.set(org, {
    name: input.businessName,
    slug: `${slugify(input.businessName)}-${orgId.slice(0, 5).toLowerCase()}`,
    status: "active",
    ownerUid: input.ownerUid,
    settings,
    subscription: { plan: "trial", status: "trialing", trialEndsAt, seats: 10 },
    createdAt: now,
    updatedAt: now,
  });

  const roleIds: Record<string, string> = {};
  SYSTEM_ROLE_KEYS.forEach((key, i) => {
    const ref = orgCol(orgId, "roles").doc(key);
    roleIds[key] = ref.id;
    batch.set(ref, {
      key,
      name: SYSTEM_ROLE_NAMES[key].en,
      nameAr: SYSTEM_ROLE_NAMES[key].ar,
      description: SYSTEM_ROLE_NAMES[key].description,
      permissions: DEFAULT_ROLE_PERMISSIONS[key],
      system: true,
      locked: key === "owner",
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    });
  });

  batch.set(orgCol(orgId, "members").doc(input.ownerUid), {
    uid: input.ownerUid,
    email: input.ownerEmail,
    displayName: input.ownerName,
    roleId: roleIds.owner,
    roleKey: "owner",
    roleName: SYSTEM_ROLE_NAMES.owner.en,
    permissions: DEFAULT_ROLE_PERMISSIONS.owner,
    allBranches: true,
    branchIds: [],
    staffId: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  batch.set(branch, {
    name: input.branchName,
    code: input.branchName.slice(0, 3).toUpperCase(),
    phone: input.phone ?? "",
    email: "",
    address: "",
    timezone: settings.locale.timezone,
    active: true,
    sortOrder: 0,
    workingHours: DEFAULT_WEEK_HOURS,
    createdAt: now,
    updatedAt: now,
  });

  DEFAULT_EXPENSE_CATEGORIES.forEach(([name, nameAr], i) => {
    batch.set(orgCol(orgId, "expenseCategories").doc(), {
      name,
      nameAr,
      active: true,
      sortOrder: i,
      createdAt: now,
    });
  });

  batch.set(userRef(input.ownerUid).collection("orgs").doc(orgId), {
    orgId,
    orgName: input.businessName,
    roleKey: "owner",
    createdAt: now,
  });
  batch.set(
    userRef(input.ownerUid),
    {
      uid: input.ownerUid,
      email: input.ownerEmail,
      displayName: input.ownerName,
      locale: input.defaultLocale,
      lastOrgId: orgId,
      ...(userExists ? {} : { createdAt: now }),
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(orgCol(orgId, "auditLogs").doc(), {
    action: "organization.created",
    entity: "organization",
    entityId: orgId,
    summary: `${input.businessName} created`,
    branchId: null,
    actorUid: input.actor?.uid ?? input.ownerUid,
    actorName: input.actor?.name ?? (input.ownerName || input.ownerEmail),
    at: now,
  });

  await batch.commit();
  return { orgId, branchId: branch.id };
}
