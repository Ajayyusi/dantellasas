# Firestore schema

This is the final data architecture for Dantella CRM. It is multi-tenant from
day one: one Firebase project serves many salon businesses
("organizations"), each with one or more branches.

## Principles

1. **Tenant isolation is structural.** Every tenant-owned document lives under
   `organizations/{orgId}/…`. There are no top-level domain collections, so a
   single rule (`isActiveMember(orgId)`) guards everything below an org, and a
   bug in one query can never read another tenant's data.
2. **Branch scoping is by field, not by path.** Branch-scoped documents carry
   `branchId` and live in org-level collections. Cross-branch reporting is a
   plain query; branch access is enforced by rules and server guards.
3. **Small documents, bounded arrays.** Anything that grows without bound
   (client notes, stock movements, audit entries) is its own collection.
   Arrays are used only when bounded and read together: appointment lines,
   invoice lines, payments on one invoice.
4. **Writes go through the server.** The browser SDK is read-only against
   domain data. Every mutation is a Next.js Server Action that authenticates
   the session, checks a permission, validates with Zod, performs the write
   (often in a Firestore transaction), and writes an audit entry. Many writes
   must update several documents atomically (a sale changes stock, client
   stats, gift-card balances and a counter), which security rules cannot
   express safely.
5. **Money is stored in minor units** (fils for AED) as integers:
   `priceMinor: 15000` is AED 150.00. Rates are stored in basis points
   (`500` = 5%). No floating-point money anywhere.
6. **Time is stored as Firestore `Timestamp`s**, plus a `dateKey`
   (`YYYY-MM-DD` in the branch time zone) on anything shown by day, so a
   day's calendar or takings are one equality query with no time-zone
   arithmetic in the query.
7. **Denormalise display names** (client name, staff name, service name) onto
   appointments and invoices. Historical records must show what was true at
   the time, even after a service is renamed or a staff member leaves.

## Identity & tenancy

```
users/{uid}                                   profile (server-written)
users/{uid}/orgs/{orgId}                      "my organizations" index (server-only)

organizations/{orgId}                         tenant root, settings, subscription
organizations/{orgId}/members/{uid}           login access: role + permissions + branches
organizations/{orgId}/roles/{roleId}          editable roles (permission sets)
organizations/{orgId}/branches/{branchId}     physical locations
```

### `users/{uid}`
| Field | Type | Notes |
| --- | --- | --- |
| `displayName`, `email` | string | |
| `locale` | `"en" \| "ar"` | UI language preference |
| `lastOrgId` | string? | org opened by default |
| `createdAt`, `updatedAt` | Timestamp | |

### `organizations/{orgId}`
| Field | Type | Notes |
| --- | --- | --- |
| `name`, `slug` | string | |
| `status` | `active \| suspended` | suspended orgs are unreachable |
| `ownerUid` | string | |
| `subscription` | map | `{ plan: trial\|starter\|growth\|enterprise, status: trialing\|active\|past_due\|cancelled, trialEndsAt, currentPeriodEnd, seats }` — first-class so the product can be sold later |
| `settings` | map | see below; one read gives the whole tenant configuration |
| `createdAt`, `updatedAt` | Timestamp | |

`settings` (all optional with defaults in code — `src/lib/settings.ts`):

| Key | Contents |
| --- | --- |
| `business` | `legalName, displayName, phone, email, website, address, trn, logoPath` |
| `locale` | `defaultLocale, currency ("AED"), timezone ("Asia/Dubai"), weekStartsOn` |
| `tax` | `enabled, pricesIncludeTax, rates: [{ id, name, rateBps, isDefault }], registrationLabel ("TRN")` |
| `payments` | `methods: [{ id, label, type: cash\|card\|bank_transfer\|gift_card\|package\|other, enabled }]` |
| `appointments` | `slotMinutes, defaultDurationMinutes, allowStaffOverlap, cancellationReasons[], requireClientForBooking` |
| `receipts` | `header, footer, showStaffOnReceipt, showTaxBreakdown, invoicePrefix` |
| `notifications` | `lowStockAlerts, dailySummaryEmail` (delivery channels are future work) |
| `appearance` | `accentColor, calendarDensity` |

### `members/{uid}` — the source of truth for access
| Field | Type | Notes |
| --- | --- | --- |
| `uid`, `email`, `displayName` | string | |
| `roleId`, `roleKey` | string | `roleKey` is the system key (`owner`, `admin`, …) or `custom` |
| `permissions` | string[] | **denormalised** from the role at assignment time so rules can check `perm in member.permissions` without a second read; rewritten for every member when a role changes |
| `allBranches` | bool | true → every branch, including future ones |
| `branchIds` | string[] | used when `allBranches` is false |
| `staffId` | string? | links the login to a staff record (own calendar, clock-in) |
| `status` | `active \| invited \| suspended` | only `active` passes rules |
| `createdAt`, `updatedAt` | Timestamp | |

Why membership documents instead of custom claims: claims are capped at 1000
bytes, need a token refresh to change, and a user can belong to several
organizations. The cost is one `get()` per rule evaluation, which is cached
per request by Firestore.

### `roles/{roleId}`
`key, name, nameAr, description, permissions[], system (bool), locked (bool), sortOrder`.
Seeded per organization: **owner** (locked), **admin**, **branch_manager**,
**receptionist**, **cashier**, **employee**, **accountant**. System roles can
be edited (except owner); custom roles can be added.

### `branches/{branchId}`
`name, code, phone, email, address, timezone, active, sortOrder,
workingHours: { "0".."6": { open: bool, start: "09:00", end: "21:00" } }`.

## Permissions

Defined once in `src/lib/permissions.ts` and mirrored in `firestore.rules`.

| Permission | Grants |
| --- | --- |
| `view_dashboard` | dashboard KPIs |
| `view_appointments` | calendar (own lines only unless `view_all_appointments`) |
| `view_all_appointments` | every staff member's calendar |
| `create_appointments`, `edit_appointments`, `cancel_appointments` | booking lifecycle |
| `view_customers`, `create_customers`, `edit_customers` | CRM |
| `view_sales`, `create_sales`, `refund_sales` | invoices, checkout, refunds |
| `apply_discounts` | manual discounts at checkout |
| `view_reports`, `export_data` | reports and CSV exports |
| `view_expenses`, `create_expenses` | expenses |
| `view_staff`, `manage_staff`, `manage_attendance` | staff records, schedules, time clock corrections |
| `view_commissions` | commission reports |
| `manage_services` | service catalog |
| `manage_inventory` | products, stock, suppliers |
| `manage_catalog` | packages, memberships, gift cards, discounts |
| `manage_settings` | business settings, branches, taxes, payments |
| `manage_users` | users, roles, permissions |
| `view_audit_log` | audit trail |

## Domain collections (all under `organizations/{orgId}/`)

| Collection | Scope | Key fields | Growth |
| --- | --- | --- | --- |
| `clients` | org | `firstName, lastName, fullName, phone, phoneNormalized, email, emailLower, birthday {month, day, year?}, gender, tags[], source, notes, preferredStaffId, marketingConsent, status (active\|archived), searchTokens[], stats {visits, totalSpendMinor, lastVisitAt, nextAppointmentAt, noShows, cancellations, firstVisitAt}` | 10⁴–10⁵ |
| `clients/{id}/notes` | org | `body, pinned, authorUid, authorName, createdAt` | unbounded → subcollection |
| `staff` | org + `branchIds[]` | `firstName, lastName, displayName, photoPath, phone, email, position, branchIds[], status (active\|inactive\|archived), color, hireDate, bookable, schedule {"0".."6": {working, start, end, breakStart?, breakEnd?}}, commission {serviceRateBps, productRateBps}, hr {dateOfBirth, nationality, passportExpiry, visaExpiry}, memberUid?, sortOrder` | 10¹–10² |
| `serviceCategories` | org | `name, nameAr, color, sortOrder, active` | small |
| `services` | org + `branchIds[]` | `categoryId, name, nameAr, description, durationMin, bufferMin, priceMinor, taxRateId?, taxExempt, branchIds[] ([] = all), staffIds[] ([] = any bookable staff), onlineBookable, active, sortOrder` | 10²–10³ |
| `appointments` | branch | `branchId, dateKey, startAt, endAt, status, source, clientId?, clientName, clientPhone, items[], staffIds[], serviceIds[], totalMinor, notes, cancellation {reasonKey, note, at, byUid}, checkedInAt, startedAt, completedAt, transactionId?, createdByUid, createdAt, updatedAt` | high |
| `blockedTimes` | branch | `branchId, staffId, dateKey, startAt, endAt, reason` | medium |
| `transactions` | branch | `number, branchId, dateKey, status, clientId?, clientName, appointmentId?, items[], subtotalMinor, discountMinor, taxMinor, totalMinor, paidMinor, balanceMinor, tipMinor, payments[], paymentMethods[], refunds[], refundedMinor, staffIds[], discountId?, notes, cashierUid, cashierName, createdAt` | high |
| `counters` | org | `{ value }` per sequence (`invoice`, `refund`) — incremented in a transaction | tiny |
| `expenses` | branch | `branchId, dateKey, date, categoryId, categoryName, amountMinor, taxMinor, vendor, supplierId?, paymentMethod, description, attachment {path, name, contentType, size}, createdByUid, createdAt` | medium |
| `expenseCategories` | org | `name, nameAr, active, sortOrder` | small |
| `productCategories` | org | `name, nameAr, sortOrder, active` | small |
| `products` | org, stock per branch | `sku, barcode, name, nameAr, brand, categoryId, supplierId?, costMinor, priceMinor, taxRateId?, minStock, trackStock, usage (retail\|professional\|both), active, stock {branchId: qty}` | 10²–10³ |
| `inventoryMovements` | branch | `productId, productName, branchId, type (purchase\|sale\|adjustment\|transfer_in\|transfer_out\|return\|internal_use), quantity (signed), balanceAfter, unitCostMinor, transactionId?, transferId?, note, createdByUid, createdAt` | unbounded |
| `suppliers` | org | `name, contactName, phone, email, trn, notes, active` | small |
| `packages` | org | `name, nameAr, description, priceMinor, validityDays, kind (services\|credit), items [{serviceId, serviceName, quantity}], creditMinor, active, sortOrder` | small |
| `clientPackages` | org | `clientId, clientName, packageId, name, kind, purchasedAt, expiresAt, transactionId, items [{serviceId, serviceName, total, used}], creditMinor, creditUsedMinor, status (active\|exhausted\|expired\|cancelled), redemptions [{at, serviceId, quantity, amountMinor, transactionId}]` | per client |
| `membershipPlans` | org | `name, nameAr, description, priceMinor, period (monthly\|quarterly\|yearly), serviceDiscountBps, productDiscountBps, includedServices [{serviceId, serviceName, quantity}], active` | small |
| `clientMemberships` | org | `clientId, clientName, planId, planName, startAt, endAt, status (active\|expired\|cancelled), autoRenew, transactionId, benefits (snapshot)` | per client |
| `giftCards` | org | `code, initialMinor, balanceMinor, issuedAt, expiresAt?, purchaserClientId?, purchaserName, recipientName, recipientEmail, message, status (active\|redeemed\|expired\|void), transactionId?, redemptions [{at, amountMinor, transactionId}]` | medium |
| `discounts` | org | `name, code?, kind (percent\|fixed), valueBps \| valueMinor, appliesTo (all\|services\|products), startsAt?, endsAt?, maxUses?, usedCount, active` | small |
| `commissionRules` | org | `name, itemType (service\|product\|all), staffId?, serviceId?, rateBps, priority, active` | small |
| `attendance` | branch | `staffId, staffName, branchId, dateKey, clockInAt, clockOutAt?, breaks [{startAt, endAt?}], workedMinutes, status (open\|closed), corrections [{atIso, byUid, byName, reason, before, after}]` | per staff per day |
| `leave` | org | `staffId, staffName, type (annual\|sick\|unpaid\|other), startDate, endDate, status (requested\|approved\|rejected), note` | small |
| `notifications` | org | `type, title, body, link, branchId?, audience (all\|permission), permission?, readBy[], createdAt` | pruned |
| `auditLogs` | org | `action, entity, entityId, summary, branchId?, actorUid, actorName, changes?, at` | unbounded, append-only |

### Appointment line (`appointments.items[]`)
```ts
{ id, serviceId, serviceName, staffId, staffName,
  startAt: Timestamp, durationMin, priceMinor, discountMinor }
```
`staffIds[]` and `serviceIds[]` are maintained from the lines so the calendar
can query "everything for Maria today" with `array-contains`. The appointment
`startAt`/`endAt` span the earliest and latest line.

### Invoice line (`transactions.items[]`)
```ts
{ id, type: "service"|"product"|"package"|"membership"|"gift_card",
  refId, name, staffId?, staffName?, quantity, unitPriceMinor,
  discountMinor, taxRateBps, taxMinor, totalMinor,
  commissionMinor, commissionRuleId? }
```
Tax and commission are **computed on the server at sale time and stored** on
the line, so reports reproduce exactly what the client paid and what staff
earned even if rates change later.

### Payments (`transactions.payments[]`)
`{ id, methodId, methodType, label, amountMinor, reference?, giftCardId?, clientPackageId?, at, byUid }`.
Split tender is simply several entries. `paymentMethods[]` mirrors the method
ids for `array-contains` filtering.

## Status machines

**Appointment:** `booked → confirmed → checked_in → in_service → completed`;
`cancelled` and `no_show` are terminal exits from any pre-completion state.
Completing checkout on an appointment sets it to `completed` and links
`transactionId`.

**Invoice:** `unpaid → partially_paid → paid`; refunds move it to
`partially_refunded` / `refunded`; `void` for an unpaid invoice created in
error. Paid invoices are never edited — only refunded.

## Derived data & counters

- **Client stats** (`visits`, `totalSpendMinor`, `lastVisitAt`,
  `nextAppointmentAt`, `noShows`, `cancellations`) are updated inside the same
  transaction as the sale or appointment status change.
- **Stock** lives on the product (`stock.{branchId}`) and is changed only in a
  transaction that also appends an `inventoryMovements` document with the
  resulting balance.
- **Invoice numbers** come from `counters/invoice`, incremented inside the
  sale transaction (`INV-000123`, prefix configurable).
- **Dashboard and reports** aggregate on read from `transactions`,
  `appointments` and `expenses` filtered by `dateKey` range and branch. At
  single-salon scale (hundreds of documents per day) this is fast and always
  exact. When a tenant outgrows it, add `dailyStats/{branchId_dateKey}`
  roll-ups written by the same transactions — the report layer already reads
  through one function per metric.

## Search

Firestore has no full-text search. Clients carry `searchTokens[]`: lower-case
prefixes of each name word (min 2 chars), the full normalised phone number and
its last 4–9 digits, and the e-mail local part. A search is one
`array-contains` query on the normalised term, ordered by `fullName`. This
covers name/phone/email lookups at front-desk scale without an external index.
Global search (⌘K) fans out the same way across clients, staff, invoices (by
number) and today's appointments. If a tenant grows past ~100k clients, swap
the token query for a search extension (Algolia/Typesense) behind the same
function.

## Indexes

Composite indexes are declared in `firestore.indexes.json`. The important
ones:

| Collection | Fields | Used by |
| --- | --- | --- |
| `appointments` | `branchId ==, dateKey range, startAt` | calendar, dashboard |
| `appointments` | `staffIds array-contains, dateKey range` | staff calendar, employee view |
| `appointments` | `clientId ==, startAt desc` | client profile |
| `transactions` | `branchId ==, dateKey range, createdAt desc` | sales list, reports |
| `transactions` | `clientId ==, createdAt desc` | client profile |
| `expenses` | `branchId ==, dateKey range` | expenses, P&L |
| `inventoryMovements` | `productId ==, createdAt desc` | stock history |
| `clients` | `searchTokens array-contains, fullName` | search |
| `auditLogs` | `entity ==, entityId ==, at desc` | activity tabs |

## Security rules summary

`firestore.rules` (tested in `tests/rules/`):

- Everything under `organizations/{orgId}` requires an **active membership**
  in that org. Membership documents cannot be written by clients, so a user
  cannot grant themselves access.
- Reads are **permission-aware**: e.g. `clients` needs `view_customers`,
  `transactions` need `view_sales` *and* access to the document's
  `branchId`, `auditLogs` need `view_audit_log`. An employee without
  `view_all_appointments` can read only appointments whose `staffIds` contain
  their own `staffId`.
- **All client writes to domain data are denied.** Writes happen in Server
  Actions through the Admin SDK after the same checks, in code
  (`src/lib/tenancy/context.ts` → `requirePermission`).
- `users/{uid}` may be read by its owner and updated only on harmless fields
  (`displayName`, `locale`, `lastOrgId`).
- Catch-all deny for everything else. Firestore is never in test mode.

Storage (`storage.rules`): files live under
`organizations/{orgId}/…`; reads need active membership; uploads are done by
the server (expense receipts, staff photos, logos) after permission checks,
with size and content-type limits enforced in code.

## Audit log

`auditLogs` entries are written by `src/lib/audit.ts` in the same
batch/transaction as the change whenever possible:

```ts
{ action: "appointment.created", entity: "appointment", entityId,
  summary: "Mariam Al Nuaimi · Haircut with Sara · 2 Oct 10:00",
  branchId, actorUid, actorName, changes?: { field: [before, after] },
  at: serverTimestamp() }
```

Actions recorded include `appointment.created|updated|rescheduled|status_changed|cancelled`,
`client.created|updated|archived`, `transaction.created|refunded|voided`,
`employee.created|updated`, `service.*`, `product.*`, `stock.adjusted`,
`expense.*`, `attendance.corrected`, `member.invited|updated`,
`role.updated`, `permission.changed`, `settings.updated`.
