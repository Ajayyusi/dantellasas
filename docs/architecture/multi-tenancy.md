# Multi-tenancy: Organization → Branch

## Model

```
users/{uid}                              profile (server-written, limited self-edit)
users/{uid}/orgs/{orgId}                 denormalized "my orgs" index (server-only)

organizations/{orgId}                    tenant root: name, plan, settings
organizations/{orgId}/members/{uid}      membership = access source of truth
organizations/{orgId}/roles/{roleId}     built-in and custom roles
organizations/{orgId}/branches/{id}      physical locations
organizations/{orgId}/<domain>/{id}      clients, appointments, transactions, … (see firestore-schema.md)
organizations/{orgId}/auditLogs/{id}     append-only trail, written in the same batch as the change
```

**Tenant isolation is structural.** Every document a tenant owns lives under
`organizations/{orgId}`. There are no top-level domain collections.

**Branch scoping is by field.** Branch-scoped documents (appointments,
transactions, expenses, stock movements, attendance…) sit in org-level
collections and carry a `branchId` field. This keeps cross-branch reports simple,
while the server and the rules both enforce branch access.

## Membership, roles and permissions

`organizations/{orgId}/members/{uid}`:

| Field | Notes |
| --- | --- |
| `roleId`, `roleKey`, `roleName` | `roleKey` is one of `owner`, `admin`, `branch_manager`, `receptionist`, `cashier`, `employee`, `accountant`, or `custom` |
| `permissions[]` | Copied from the role. Updated on every member of a role when the role changes (Settings → Roles) |
| `allBranches`, `branchIds[]` | Branch access; owners and admins are always org-wide |
| `staffId` | Linked staff record (employees see only their own appointments) |
| `status` | `active` \| `invited` \| `suspended` |

Permissions live on membership documents, not in custom claims. Claims are
capped at 1000 bytes, need a token refresh to update, and a user can belong to
many organizations. The rules pay one `get()` per request.

The owner role always has every permission, and the last owner cannot be
demoted or removed.

## Enforcement layers

1. **Server context** (`src/lib/tenancy/context.ts`). `getAppContext()`
   resolves the session, the active organization (cookie `dc_org`), the member,
   the permissions and the branch scope (cookie `dc_branch`; `all` means every
   branch the member can use).
   - Pages call `requirePagePermission()`, which renders a 403 via `forbidden()` when the member lacks the permission.
   - Server actions go through `action({ schema, permission })` in `src/lib/actions.ts`, which re-checks everything on every call.
   - The Admin SDK bypasses rules, so this layer is mandatory.
2. **Firestore rules** (`firestore.rules`). These cover any direct client SDK
   access, which today is only the live calendar listener.
   - Reads require an active membership, the relevant permission and branch access.
   - Employees can only read appointments that include their own staff id.
   - All client writes are denied.
   - Tested in `tests/rules`.
3. **UI**. The navigation and actions a member sees are filtered by permission.
   This is a convenience only; it is never relied on for security.

## Organization creation

`createOrganizationAction` (self sign-up and "Add another business") and the
platform admin's `createSalonAction` run `provisionOrganization()`. In one
batch it writes the organization, its settings defaults, the built-in roles,
the owner membership, the first branch, the user→org index and an audit
entry. It can optionally seed demo data.

## Platform admin

`/admin` is for the people who run Dantella itself, not for salons:

- **Who**: emails listed in `PLATFORM_ADMIN_EMAILS` (in production the Secret
  Manager secret `platformAdminEmails`, so addresses stay out of the public
  repo). The Firebase account must have a verified email; a listed account
  that isn't verified is asked to confirm it first.
- **Sign-in**: `/admin/login` offers Google sign-in (the Google provider must be
  enabled in Firebase → Authentication → Sign-in method) or the normal email
  and password sign-in.
- **Enforcement**: `src/lib/platform/guard.ts`. Pages call
  `platformAdminForPage()` and actions are built with `platformAction()`;
  both read the account live from Firebase Auth on every request. Admin data
  is read with the Admin SDK on the server only, so Firestore rules are
  unchanged and give clients no cross-tenant access.
- **What it does**: lists every organization (owner, team, clients, last
  activity, plan, status); creates a salon with its first branch and an owner
  login (`provisionOrganization` + a password-setup link to share); suspends
  and reactivates organizations (`status`; members are refused on their next
  request); issues a fresh owner setup link only while the owner has never
  used their login, so the admin can't take over a working account.
- **Audit**: platform changes are written to the salon's own audit log as
  "Dantella team", without the admin's email.

## Several businesses per user

Owners can add another business from the business switcher
(`/onboarding?another=1`). A user who belongs to several organizations is
only refused as suspended when none of them is active; otherwise they land in
the next active one.

## Open items

- Invitation emails: users added in Settings get a password-setup link to share. Sending the link automatically needs an email provider.
- Per-branch roles for staff who work across branches (today one role applies to all branches the member can use).
