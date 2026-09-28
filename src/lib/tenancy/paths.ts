/**
 * Single source of truth for Firestore paths. Every tenant-owned document
 * lives under organizations/{orgId}/… so tenant isolation is structural and
 * enforceable in security rules.
 *
 * Future domain collections go under `org(orgId)` and carry a `branchId`
 * field when branch-scoped. Do not add them until research is verified.
 */
export const paths = {
  users: () => "users",
  user: (uid: string) => `users/${uid}`,
  userOrgs: (uid: string) => `users/${uid}/orgs`,
  userOrg: (uid: string, orgId: string) => `users/${uid}/orgs/${orgId}`,

  orgs: () => "organizations",
  org: (orgId: string) => `organizations/${orgId}`,
  members: (orgId: string) => `organizations/${orgId}/members`,
  member: (orgId: string, uid: string) => `organizations/${orgId}/members/${uid}`,
  branches: (orgId: string) => `organizations/${orgId}/branches`,
  branch: (orgId: string, branchId: string) => `organizations/${orgId}/branches/${branchId}`,
  auditLog: (orgId: string) => `organizations/${orgId}/auditLog`,
} as const;
