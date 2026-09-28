# Product Research — Reference Platform Review

> **Status: NOT YET VERIFIED.** Nothing in the product sections below has been
> confirmed by inspecting the reference platform. Every item stays marked
> `NOT YET VERIFIED` until it has been observed first-hand and logged in the
> Research Log with a date.

## Ground rules

- **Purpose:** understand *capabilities and workflows* salon operators expect,
  so our own product is designed from evidence, not assumptions.
- **Do not copy** the reference platform's branding, logos, colors, icons,
  illustrations, UI text/copy, source code, or any other proprietary asset.
  Record *what a feature does*, in our own words.
- **No customer data.** Never record real client names, phone numbers,
  emails, or transaction details. Screenshots (if any) go in
  `docs/research-captures/` which is git-ignored, and must be redacted.
- **Read-only.** During inspection, do not create, edit, delete, send, or
  submit anything in the live account.
- Our product decisions go in `docs/adr/`, not here. This file is evidence only.

## Verification legend

| Marker | Meaning |
| --- | --- |
| `NOT YET VERIFIED` | Not observed. Placeholder or open question. |
| `OBSERVED (YYYY-MM-DD)` | Seen directly in the reference platform. |
| `PARTIAL (YYYY-MM-DD)` | Area opened but not fully explored. |
| `NOT PRESENT (YYYY-MM-DD)` | Looked for it; it doesn't exist there. |

---

## 0. Access & context

| Item | Status | Notes |
| --- | --- | --- |
| Entry URL | `OBSERVED (2026-09-28)` | `https://www.salonaty.com/ar/merchant/welcome` loads (Arabic, merchant area). |
| Login method (phone/OTP, email, etc.) | `NOT YET VERIFIED` | User handles login personally. |
| Account type inspected (plan/tier) | `NOT YET VERIFIED` | |
| Languages / RTL support | `NOT YET VERIFIED` | |
| Mobile vs desktop layout | `NOT YET VERIFIED` | |

## 1. Navigation map

`NOT YET VERIFIED` — list top-level sections and their sub-pages as observed.

| Section (our neutral name) | Sub-pages | Status |
| --- | --- | --- |
| | | `NOT YET VERIFIED` |

## 2. Organization, branches & staff

| Question | Status | Findings |
| --- | --- | --- |
| Can one account manage multiple branches? | `NOT YET VERIFIED` | |
| How is the active branch selected / switched? | `NOT YET VERIFIED` | |
| What is configured per branch vs per business? | `NOT YET VERIFIED` | |
| Staff/user roles and permission granularity | `NOT YET VERIFIED` | |
| Staff profiles: fields, services assigned, commission | `NOT YET VERIFIED` | |
| Working hours / shifts / breaks / time off | `NOT YET VERIFIED` | |

## 3. Services & catalog

| Question | Status | Findings |
| --- | --- | --- |
| Service fields (duration, price, category, gender, etc.) | `NOT YET VERIFIED` | |
| Variants / add-ons / packages / bundles | `NOT YET VERIFIED` | |
| Products / retail inventory | `NOT YET VERIFIED` | |
| Per-branch or per-staff pricing | `NOT YET VERIFIED` | |

## 4. Appointments / calendar

| Question | Status | Findings |
| --- | --- | --- |
| Calendar views (day/week/staff columns) | `NOT YET VERIFIED` | |
| Booking creation steps & required fields | `NOT YET VERIFIED` | |
| Appointment statuses & transitions | `NOT YET VERIFIED` | |
| Walk-ins, waitlist, recurring bookings | `NOT YET VERIFIED` | |
| Online booking / customer-facing channel | `NOT YET VERIFIED` | |
| Reminders / notifications (SMS, WhatsApp, email) | `NOT YET VERIFIED` | |
| Deposits / cancellation / no-show policy | `NOT YET VERIFIED` | |

## 5. Clients / CRM

| Question | Status | Findings |
| --- | --- | --- |
| Client profile fields | `NOT YET VERIFIED` | |
| Visit history, notes, preferences, tags | `NOT YET VERIFIED` | |
| Segmentation / filters / export | `NOT YET VERIFIED` | |
| Loyalty / points / memberships / gift cards | `NOT YET VERIFIED` | |
| Marketing campaigns / messaging | `NOT YET VERIFIED` | |
| Reviews / feedback | `NOT YET VERIFIED` | |

## 6. POS / checkout & payments

| Question | Status | Findings |
| --- | --- | --- |
| Checkout flow from appointment | `NOT YET VERIFIED` | |
| Payment methods, split payments | `NOT YET VERIFIED` | |
| Discounts, coupons, tips | `NOT YET VERIFIED` | |
| Tax / VAT handling & invoices | `NOT YET VERIFIED` | |
| Refunds, cash drawer / shift close | `NOT YET VERIFIED` | |

## 7. Reports & dashboard

| Question | Status | Findings |
| --- | --- | --- |
| Dashboard KPIs shown | `NOT YET VERIFIED` | |
| Report types (sales, staff, services, clients) | `NOT YET VERIFIED` | |
| Date / branch filters, exports | `NOT YET VERIFIED` | |

## 8. Settings & integrations

| Question | Status | Findings |
| --- | --- | --- |
| Business settings (hours, currency, timezone) | `NOT YET VERIFIED` | |
| Notification templates | `NOT YET VERIFIED` | |
| Third-party integrations | `NOT YET VERIFIED` | |
| Subscription / billing for the merchant | `NOT YET VERIFIED` | |

## 9. Gaps & opportunities (our analysis)

`NOT YET VERIFIED` — fill only after sections 1–8 have observations.

## 10. Implications for our data model

Candidate domain entities to add under `organizations/{orgId}/…` — each
must cite the observation above that justifies it.

| Entity | Branch-scoped? | Justified by | Status |
| --- | --- | --- | --- |
| | | | `NOT YET VERIFIED` |

---

## Research log

| Date | Who | Area | What was done |
| --- | --- | --- | --- |
| 2026-09-28 | Claude | Access | Confirmed merchant welcome page loads. No sections inspected yet. |
