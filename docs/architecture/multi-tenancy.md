# Multi-tenancy: Organization → Branch

## Model

```
users/{uid}                              profile (server-written, limited self-edit)
users/{uid}/orgs/{orgId}                 denormalized "my orgs" index (server-only)

organizations/{orgId}                    tenant root
organizations/{orgId}/members/{uid}      membership = access source of truth
organizations/{orgId}/branches/{id}      physical locations
organizations/{orgId}/auditLog/{id}      append-only admin trail
organizations/{orgId}/<domain>/{id}      FUTURE — pending verified research
```

**Tenant isolation is structural:** every tenant-owned document lives under
`organizations/{orgId}`. There are no top-level domain collections.

**Branch scoping is by field:** future branch-scoped documents carry
`orgId` and `branchId` fields (stay in org-level collections, not nested under
branches). This keeps cross-branch queries (org reports) simple while rules
enforce `branchId` access. Revisit per entity once research is verified.

## Membership & roles

`organizations/{orgId}/members/{uid}`:

| Field | Notes |
| --- | --- |
| `role` | `owner` > `admin` > `manager` > `staff` (generic; may change after research) |
| `branchIds` | `[]` = all branches. Owners/admins are always org-wide. |
| `status` | `active` \| `invited` \| `suspended` |

Why membership docs rather than custom claims: claims are capped at 1000 bytes,
need a token refresh to update, and a user can belong to many orgs. Rules pay
one `get()` per request; acceptable at this stage. Re-evaluate if cost matters.

## Enforcement layers

1. **Firestore rules** (`firestore.rules`) — for any direct client SDK access.
   Tenancy-structure writes are server-only.
2. **Server guards** (`src/lib/tenancy/guards.ts`) — `requireOrg()` /
   `requireBranch()`; mandatory before any Admin SDK tenant access, since the
   Admin SDK bypasses rules.
3. **Routing** — `/o/[orgId]/…` and `/o/[orgId]/b/[branchId]/…`; the org
   layout runs `requireOrg()`, returning 404 (not 403) to avoid leaking
   org existence.

## Org creation

`POST /api/organizations` → `createOrganization()` writes in one batch: org,
owner membership, first branch, user→org index, audit entry.

## Open items

- Invitations flow (`invited` status exists; no flow yet).
- Org-level settings beyond timezone/currency/locale — `NOT YET VERIFIED` what's needed.
- Whether staff who work across branches need per-branch roles — `NOT YET VERIFIED`.
