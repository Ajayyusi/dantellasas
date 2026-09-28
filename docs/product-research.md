# Product Research — Reference Platform Review

> **Status: PARTIALLY VERIFIED (passes on 2026-09-28).** Items are marked
> individually. Anything still marked `NOT YET VERIFIED` has not been observed
> first-hand. Pass 1 was read-only (lists, headers, settings). Pass 2 opened
> create forms and the POS flow **without saving anything**: every form was
> closed or cancelled, and the audit log showed no entries afterwards.

## Ground rules

- **Purpose:** understand the *capabilities and workflows* salon operators
  expect, so our product is designed from evidence, not assumptions.
- **Do not copy** the reference platform's branding, logos, colors, icons,
  illustrations, UI text/copy, source code or other proprietary assets.
  Record *what a feature does*, in our own words.
- **No customer or staff data.** Don't record real names, phone numbers,
  emails, tax numbers or transaction details. Screenshots, if any, go in
  `docs/research-captures/` (git-ignored) and must be redacted.
- **Read-only.** During inspection, don't create, edit, delete, send or submit anything.
- Our product decisions go in `docs/adr/`. This file is evidence only.

## Verification legend

| Marker | Meaning |
| --- | --- |
| `NOT YET VERIFIED` | Not observed. Placeholder or open question. |
| `OBSERVED (YYYY-MM-DD)` | Seen directly in the reference platform. |
| `PARTIAL (YYYY-MM-DD)` | Area opened but not fully explored (e.g. list seen, create form not). |
| `NOT PRESENT (YYYY-MM-DD)` | Looked for it and did not find it. |

Inspected account: a single-location women's beauty salon in the UAE (Ajman),
Arabic UI, currency AED, VAT 5%.

---

## 0. Access & context

| Item | Status | Notes |
| --- | --- | --- |
| Entry URL | `OBSERVED (2026-09-28)` | Merchant area under `/ar/merchant/*`. Welcome page, then dashboard. |
| Login method | `NOT YET VERIFIED` | Session was already signed in. |
| Account/plan | `OBSERVED (2026-09-28)` | Merchant has a paid subscription with an expiry date and a renew action. There is a "profile completeness" meter and a setup wizard (`/merchant/wizard`). |
| Languages | `OBSERVED (2026-09-28)` | Arabic UI (RTL). Per-user "preferred language" setting. Catalog entities have **both English and Arabic names**. WhatsApp messages can be sent in Arabic or English. |
| Signed-in identity | `OBSERVED (2026-09-28)` | Users sign in as an **employee** (the profile menu shows an employee profile). A **lock screen** exists for shared devices. |
| Mobile vs desktop layout | `NOT YET VERIFIED` | Only desktop was inspected. |

## 1. Navigation map — `OBSERVED (2026-09-28)`

Neutral names; the route is shown for reference.

| Section | Sub-pages |
| --- | --- |
| Dashboard | `dashboard` |
| Cashier / POS | `pos` |
| Appointments | `appointments` |
| Reports | general, inventory, management, accounting |
| Marketing | `marketing-tools` (WhatsApp marketing) |
| Customers | `customers`, `customers/:id` |
| Staff | list, HR info, roles/permissions, attendance |
| Menu (in-salon) | categories, services, single-service offers, multi-service offers (packages), subscriptions |
| Home services | categories, services, service areas |
| Products / inventory | define product, active products, add stock, adjust stock, internal use, stock operations |
| Accounting | sales (invoices), payments |
| Advanced accounting | chart of accounts, purchases (+ new purchase), journal entries, payroll, suppliers, expenses |
| Settings | general, invoice, accounting, notifications, online, rating-screen, audit logs |

Global UI: notification bell (includes low-stock alerts), "send alert to management",
a quick-actions menu (price list, home-service price list, product price lookup,
add internal use), a **daily-activities drawer**, and an **appointment monitor**
panel. The notification center has tabs: all / surveys / complaints / system updates.

## 2. Organization, branches & staff

| Question | Status | Findings |
| --- | --- | --- |
| Multiple branches per account? | `NOT PRESENT (2026-09-28)` in this account | No branch switcher or branch field seen. The header shows the business name as a clickable element, but its purpose is unverified. **Our multi-branch model goes beyond what was observed here.** |
| Business profile | `OBSERVED` | Bilingual name, logo, business category (e.g. women's salon), country, city, owner email, subscription status. |
| Staff list fields | `OBSERVED` | Name, sort order, email, role, **bookable in-system** toggle, **bookable online** toggle, **show at checkout** toggle, status. |
| Staff HR info | `OBSERVED` | Birth date, salary, commission, **passport expiry**, **residence-visa expiry**, join date, leave date. This is UAE-specific HR tracking. |
| Roles & permissions | `OBSERVED` | Named, bilingual, custom roles (e.g. "no permissions", "profile & activities", "all permissions", "cashier"). Permissions are **very granular**: module access, plus specific actions (cancel invoice / issue credit note, change the price on an invoice, edit payment method, cancel a deposit, view all staff appointments, change staff working hours, manage blocked times, issue a free gift card, export/print, use expired package services, training account), plus **access to each report individually**. |
| Attendance | `OBSERVED` | A grid of staff avatars, each showing present / not present. Tapping one presumably clocks that person in or out (not tapped). There are also attendance reports (detailed and aggregate) and an attendance-payment report. |
| Staff profile | `OBSERVED` | Tabs: General · Assigned services · Working hours · Leaves · Notes. Header stats: services performed, total revenue. Shows role summary, a working/active status, Excel export, and an activity table (date, invoice #, service/product, price, commission). |
| Staff working hours | `OBSERVED` | **One shift per weekday** per staff member (from, to, working-day flag). |
| Staff leaves | `OBSERVED` | Leave name, from, to, notes. |
| Staff row actions | `OBSERVED` | Edit, move down, change sort order. The sort order drives column order in the calendar and POS. |
| Staff ↔ service link | `OBSERVED` | Services list which staff can perform them. Setting: "link staff to service / to product". "Show staff by specialty at checkout". |
| Working hours | `OBSERVED` | Business hours are set per weekday (open/close, working-day flag). Staff have their own weekly hours (see above). |

## 3. Services & catalog

| Question | Status | Findings |
| --- | --- | --- |
| Categories | `OBSERVED` | Sort order, EN/AR name, show-to-customer toggle, status. |
| Service fields | `OBSERVED` (list level) | Category, sort order, EN/AR name, price, **price incl. VAT**, assigned staff, **duration (minutes)**, show-to-customer toggle, status. |
| Single-service offers | `OBSERVED` | Image, service, regular price, offer price, valid from/to, show online, status. |
| Multi-service offers / packages | `OBSERVED` | Image, EN/AR name, included services, price, offer price, from/to, **type**, show online, status. Customers keep **service balances** (a report tracks this). |
| Subscriptions / memberships | `OBSERVED` | Image, EN/AR name, price, price incl. VAT, **duration in days**, status. |
| Home services | `OBSERVED` | A separate catalog (categories and services with the same fields), plus **service areas** (EN/AR name, status). |
| Products | `OBSERVED` | EN/AR name, **barcode**, **usage type** (retail vs internal, presumably — values unverified), price, price incl. VAT, **average cost**, **low-stock alert threshold**, current quantity, status. |
| Stock operations | `OBSERVED` | Ledger: date, type, employee, receipt, product, qty, avg cost, price, issued by. Operations: add stock, adjust stock, internal use. Setting: "allow selling without stock". |
| Add-service form | `OBSERVED` | Category, EN name, AR name, price, price incl. VAT, staff (multi-select with "select all"), duration (minutes), show-to-customer. The services menu also has an **"assistant"** that seems to activate services from a preset catalog (see the "activate services" link). |
| Define product | `OBSERVED` | Starts with a **search of a shared product catalog by barcode or name**. It returns branded retail products with barcodes, so the platform keeps a global master product list that merchants adopt. Adopting a product was not tried. |

## 4. Appointments / calendar

| Question | Status | Findings |
| --- | --- | --- |
| Calendar view | `OBSERVED` | **Day view with one column per staff member** (each column header shows that staff member's service count). Rows are time slots with sub-divisions. Previous/next/today navigation. |
| Actions | `OBSERVED` | Menu: add appointment, add **blocked time**, plus one more item that wasn't legible. |
| Other views (week/month) | `NOT YET VERIFIED` | |
| Add-appointment flow | `OBSERVED` | A dedicated page with three panels. **(1) Slot builder:** date (prev/today/next), service (searchable; each option shows duration and price), staff (**only staff linked to that service**), time (**15-minute available slots**), end time (auto-calculated). **(2) Selected appointments:** a list of service+staff+time lines with an **editable price** and a remove button. **Several services can be booked in one visit.** Plus booking notes. **(3) Customer:** search by mobile (+971 default). Tested adding a line and removing it; nothing was saved. |
| Blocked times | `OBSERVED` | Actions menu: add appointment, add blocked time, list blocked times. |
| Statuses & transitions | `NOT YET VERIFIED` | A "cancellation reasons" report exists, and there are no-show rescheduling messages. |
| Overbooking | `OBSERVED` (settings) | Toggles: allow staff overbooking, allow customer overbooking. |
| Online booking | `OBSERVED` (settings) | Public page with EN/AR slugs, background image, show menu, allow online bookings, a max limit, payment method, customer email required, social links, marquee text, gallery, online working hours, complaints. |
| Reminders / messaging | `OBSERVED` (settings) | WhatsApp templates: no-show rescheduling, cancellation, salon rating request, birthday greetings, WhatsApp offers. Manual vs WhatsApp settings. |
| "Pay now, use later" | `OBSERVED` (setting) | Prepaid appointments/services. |

## 5. Customers / CRM

| Question | Status | Findings |
| --- | --- | --- |
| List columns | `OBSERVED` | Name + mobile (with WhatsApp shortcut), **last visit (days ago)**, **loyalty points**, **wallet balance**, **total sales**, notes, status. Search, customizable filters, active-only toggle, export, add. Row actions: edit, disable, and one more. |
| Add-customer form | `OBSERVED` | Required section: name, mobile (+971 default), email. Collapsible "additional info": **WhatsApp contact consent** toggle, gender, acquisition source (options include Facebook and walk-by; full list not captured), notes, nationality, birth date, address, Google Maps. Closed without saving. |
| Profile fields | `OBSERVED` | Email, nationality, gender, **acquisition source**, tax number, birth date, area, address, Google Maps location, notes, date added. A status badge (looked like "lost/lapsed"; unverified). |
| Profile tabs | `OBSERVED` | General · Appointments · Offers & online bookings · Subscriptions. |
| Profile widgets | `OBSERVED` | Preferred staff, wallet (with actions), loyalty points (convertible to wallet credit), invoices (current/archived), activity history (date, service/product, staff, price). "New invoice" shortcut. |
| Loyalty | `OBSERVED` | Program config: code, **points per currency paid (%)**, auto-add toggle, status. Org-wide total of outstanding points, with an option to clear all points. |
| Wallet / customer credit | `OBSERVED` | Customer wallet balance. Setting: allow customer debt. |
| Gift cards | `OBSERVED` | Present in POS and reports (active / used / expired). |
| Discount codes | `OBSERVED` (settings tab) | Details not inspected. |
| Marketing | `OBSERVED` | WhatsApp marketing. Permissions also mention email campaigns and ad campaigns. |
| Surveys / complaints / ratings | `OBSERVED` | Post-service rating (1–5 per service line), surveys, complaints, and a configurable **rating screen**. |
| Customer-type history | `OBSERVED` (report name) | Implies customer segmentation (new/returning/lapsed?). Rules not verified. |

## 6. POS / checkout & payments

| Question | Status | Findings |
| --- | --- | --- |
| Entry | `OBSERVED` | Start by entering the **customer's mobile number** (country code defaults to +971) or choose **walk-in (no number)**. Side panels: customer care, gift cards, **current cashier employee**, staff activities, system updates. |
| Checkout flow | `OBSERVED` | **Cart screen:** customer bar (walk-in / code / number). Category buttons, then item tiles showing name, price and duration. Tapping an item adds a line, then asks you to **pick the staff member** from an avatar grid. Line: item + staff (changeable), qty, **editable price**, per-line note, remove. Totals: item count, subtotal, VAT, total (**prices are VAT-inclusive**: 220 total = 209.52 + 10.48 VAT). Invoice notes, **Continue to payment**, Cancel. Top bar: search, Products, and More (special item, **tips** with an amount + staff picker, **split across staff**). **Payment screen:** summary tiles (sales total, wallet, loyalty), loyalty redemption, **coupon / gift card**, **discount code**, payment lines (method + amount, add more for **split payment**, calculator), then **Issue invoice** or **Cancel issuing**. Tested up to the payment screen and cancelled; nothing was issued. |
| Payment methods | `OBSERVED` | Configurable list: cash, credit card, debit card, bank transfer, cheque, payment link, **BNPL providers**, a deals-voucher provider, online payment gateway. Each can be enabled/disabled. |
| Invoice | `OBSERVED` | Subtotal, VAT, total, paid, remaining (so **partial payments** exist). Invoice notes. **Credit notes and debit notes**, refunds/returned invoices, and suspended (held) invoices. Settings: template, QR code, show staff on invoice, customer name/mobile display, separate service tickets with queue number, reprint control, email invoice to owner, email staff about assigned/completed services, next credit/debit note numbers. |
| Tax | `OBSERVED` | Named tax with rate (VAT 5%), TRN, status. |
| Sales list | `OBSERVED` | Date/time, invoice #, customer, mobile, subtotal, VAT, total, notes, status, issued by. Current vs archived. Date filter. |
| Payments list | `OBSERVED` | Date/time, reference, type, customer, amount, method, status, issued by. |
| Tips & commissions | `OBSERVED` | The dashboard staff table includes tips and commissions. There is a commissions report. |
| Self-checkout kiosk | `OBSERVED` | A "self cashier" mode exists. It requires the payment gateway to be active. |

## 7. Reports & dashboard

| Question | Status | Findings |
| --- | --- | --- |
| Dashboard | `OBSERVED` | Cards with a per-card date filter: payments (bank status), wallet withdrawals, **profit & loss chart** (sales / expenses / profit), new customers, customer visits, services delivered, **staff performance table** (staff, staff %, services, products, special, total, tips, commissions). "Forecasts" button. |
| Appointment reports | `OBSERVED` | Appointments, home services, attendance-payment, cancellation reasons. |
| Management reports | `OBSERVED` | Staff transactions (+ summary), attendance detailed/aggregate, staff commissions, services, offers, customer discounts, customer service balances, sales by type, gift cards (active/used/expired), surveys, complaints, online visits, customer-type history. |
| Inventory reports | `OBSERVED` | Stock status, stock movement over a period, internal use, most-used products, best-selling products. |
| Accounting reports | `OBSERVED` | Daily / monthly general summary, summary by cashier, daily / monthly payment summary, successful/failed gateway transactions, credit/debit notes, P&L, total VAT, returned invoices. |
| Exports | `OBSERVED` | "Export" on nearly every list. |

## 8. Settings, accounting & integrations

| Question | Status | Findings |
| --- | --- | --- |
| General settings tabs | `OBSERVED` | Main info, general toggles, working hours, payment methods, tax, discount codes, loyalty, attendance, theme, payment-gateway settings, self-cashier, system control, backup, merchant billing invoices, fiscal year. |
| General toggles | `OBSERVED` | Link staff↔service, link staff↔product, sell without stock, allow customer debt, staff overbooking, customer overbooking, suspend invoice, allow product sales, allow quantity change, pay-now-use-later, show staff by specialty at checkout. |
| Advanced accounting | `OBSERVED` | Chart of accounts (assets, liabilities, equity, income, COGS, expenses; each with a sub-category and balance), payment posting, journal entries, purchases (supplier, supplier invoice date/#, total, tax paid, grand total, linked journal entry), payroll, suppliers, expenses (incl. expected expenses). |
| Audit log | `OBSERVED` | Date/time, operation, reference, change, employee. Exportable, date filter. |
| Integrations | `PARTIAL` | WhatsApp messaging, a payment gateway, BNPL providers, a print-helper integration. |

## 9. Gaps & opportunities (our analysis — to be refined)

- **Multi-branch** was not observed in this account. Our org → branch model
  supports it, but whether we *need* it for launch is a product decision.
- Very broad feature surface. We need to decide an MVP slice rather than chase parity.
- UAE-specific needs are clear: VAT/TRN, +971 default, visa/passport expiry
  tracking, Arabic-first bilingual data, WhatsApp as the primary channel, BNPL.

## 10. Implications for our data model (candidates — not yet built)

All live under `organizations/{orgId}/…`. `branchId` applies if we keep multi-branch.

| Entity | Branch-scoped? | Justified by | Status |
| --- | --- | --- | --- |
| serviceCategories, services (bilingual, duration, price, VAT-inclusive price, staff links, visibility flags) | org (with per-branch availability TBD) | §3 | candidate |
| offers / packages, subscriptions, customer service balances | org | §3, §7 | candidate |
| homeServiceAreas | org | §3 | candidate |
| products, stockMovements | branch | §3 | candidate |
| customers (profile, wallet, loyalty points, preferred staff) | org | §5 | candidate |
| staff (HR fields, bookable flags, commission) + roles (granular permissions) | org + branch assignment | §2 | candidate — replaces our generic 4-role RBAC |
| appointments, blockedTimes | branch | §4 | candidate — fields/statuses NOT YET VERIFIED |
| invoices (lines, VAT, partial payments, credit/debit notes), payments | branch | §6 | candidate |
| paymentMethods, taxes, loyaltyProgram, discountCodes, settings | org | §8 | candidate |
| ratings, surveys, complaints | branch | §5 | candidate |
| accounting (accounts, journal entries, purchases, suppliers, expenses, payroll) | org | §8 | candidate — likely post-MVP |

## Still to inspect

1. Appointment **statuses** and what happens after booking (confirm, check-in, turn into an invoice, no-show). Needs an existing appointment to look at.
2. Online booking page as a customer sees it.
3. Package/subscription redemption at checkout.
4. The customer row action that wasn't legible, and the wallet actions.
5. Mobile layout.

---

## 11. Module summaries — what the reference does, in our words

This consolidates §1–§8 into the workflows an operator actually runs, and
records where our product deliberately diverges. `DESIGNED (not observed)`
marks answers that come from general salon-software practice, not from the
reference platform.

### Dashboard
- **Does:** date-filtered cards for revenue/payments, a sales-vs-expenses
  profit chart, new customers, visits, services delivered, and a staff
  performance table with tips and commissions. Each card has its own date
  filter.
- **Diverge:** one global date-range control for the whole page (per-card
  filters make numbers impossible to compare), plus operational widgets the
  reference keeps in drawers: today's upcoming appointments and status mix.

### Appointments
- **Does:** day view with one column per staff member; add appointment, add
  blocked time; overbooking toggles; online booking page; WhatsApp
  reminder/no-show templates; cancellation reasons are reported.
- **Booking (observed):** a dedicated three-panel page — slot builder
  (date, searchable service, only staff linked to that service, 15-minute
  available slots, auto end time), a list of selected lines with editable
  price (several services per visit), and customer lookup by mobile.
- **Statuses and post-booking lifecycle:** `DESIGNED (not observed)`. We
  model *booked → confirmed → checked-in → in service → completed*, with
  *cancelled* and *no-show* as terminal exits.
- **Diverge:** week view and a list view alongside the staff day view;
  drag-and-drop rescheduling; a single booking drawer that never leaves the
  calendar.

### Customers
- **Does:** list with last-visit recency, loyalty points, wallet, total
  sales; rich profile (nationality, source, TRN, area, map pin); tabs for
  appointments, offers/online bookings, subscriptions; preferred staff;
  activity history; "new invoice" shortcut.
- **Diverge:** a profile built around what the front desk needs at a glance
  (next appointment, lifetime value, no-show risk, notes pinned at the top)
  rather than a long form; tags; a unified activity timeline.

### Staff
- **Does:** staff with bookable/online/checkout toggles, UAE HR fields
  (passport and residence-visa expiry), salary and commission, granular
  role permissions, an attendance grid (present / not present per
  person), one shift per weekday per staff member, leaves, and a profile
  with services, hours, leaves, notes and an activity/commission table.
- **Diverge:** login *users* are separate from *staff records* (a
  receptionist may have no bookable calendar; a stylist may never log in),
  linked when needed; document-expiry warnings surface on the staff list.

### Services & catalog
- **Does:** ordered categories and services with bilingual names, price and
  VAT-inclusive price, duration, assigned staff, visibility; single-service
  offers; multi-service packages with customer service balances;
  subscriptions with a duration in days; separate home-service catalog.
- **Diverge:** one catalog (home services become a service attribute later),
  drag-to-reorder, per-branch availability, per-service tax override.

### POS / checkout
- **Does:** starts from the customer's mobile number (+971 default) or
  walk-in; configurable payment methods including BNPL and payment links;
  partial payments; credit/debit notes; held (suspended) invoices; gift
  cards; tips; self-checkout kiosk mode.
- **Cart and payment (observed):** category buttons → item tiles → pick
  staff from an avatar grid; lines with qty, editable price and note;
  VAT-inclusive totals; tips with a staff picker; a separate payment screen
  with coupon/gift card, discount code and split payment lines, then issue.
- **Ours:** the same two steps on one screen — catalog on one side, ticket
  and tender on the other — so a cashier never loses sight of the cart;
  staff defaults from the appointment line instead of a modal every time.

### Sales, payments, expenses & accounting
- **Does:** invoice list (current/archived), payments list, full
  double-entry accounting (chart of accounts, journal entries, purchases,
  payroll, suppliers, expenses).
- **Diverge:** launch with sales, payments, refunds, expenses and suppliers;
  double-entry accounting is out of scope for v1 (exports cover the
  accountant).

### Inventory
- **Does:** products with barcode, retail/internal usage, average cost,
  low-stock threshold; ledger of stock operations (add, adjust, internal
  use); optional selling without stock.
- **Diverge:** per-branch stock, transfers between branches, low-stock
  indicators in the list and notification area.

### Reports
- **Does:** ~40 reports across appointments, management, inventory and
  accounting, each exportable.
- **Diverge:** a smaller set of well-designed reports with the same filter
  bar (date range, branch, staff) and CSV export, instead of a long menu.

### Settings & permissions
- **Does:** many settings tabs; granular custom roles with per-report
  access; audit log with operation/reference/change/employee.
- **Diverge:** seven default roles that can be edited or cloned, permissions
  grouped by module in a matrix, audit log covering every write.

## 12. UX assessment (our opinion)

- **Breadth over depth.** The reference covers an enormous surface; the
  cost is long menus and many similar-looking list pages. We aim for fewer,
  richer screens.
- **Drawers for secondary information** (daily activities, appointment
  monitor) are useful for reception staff; we keep the idea as a
  right-hand panel on the calendar rather than global drawers.
- **Bilingual data entry** (EN + AR names on catalog items) is a genuine
  regional requirement; we keep it as optional Arabic name fields.
- **Per-card date filters** on the dashboard make comparison hard; we use
  one page-level range.

## Research log

| Date | Who | Area | What was done |
| --- | --- | --- | --- |
| 2026-09-28 | Claude | Access | Confirmed the merchant area loads. The session was already signed in. |
| 2026-09-28 | Claude | All sections | Read-only first pass: full nav map; list-page columns for customers, staff, services, offers, subscriptions, home services, products, stock, sales, payments, purchases; customer profile layout; role permission list; all report names; general/invoice/notification/online settings; audit log. No forms opened, nothing submitted, no personal data recorded. |
| 2026-09-28 | Claude (build session) | Synthesis | Added §11–§12 (module summaries, UX assessment) from passes 1–2. Build container cannot reach the reference site; nothing new observed from there. |
| 2026-09-28 | Claude | Create flows | With the user's OK: opened add-appointment (added and removed a line), POS walk-in up to the payment screen (then cancelled and cleared the cart), add-customer, add-service, define-product search, staff profile tabs, attendance. Nothing saved; today's audit log is empty. |
