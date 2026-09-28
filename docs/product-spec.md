# Dantella CRM — Product specification

Dantella CRM is a salon, spa and barbershop management platform: appointments,
clients, staff, services, checkout, sales, inventory and reporting in one
calm, fast, bilingual (English/Arabic) product. It launches for one salon
group in the UAE and is architected as multi-tenant SaaS from day one.

"Dantella CRM" is a **temporary product name**. Platform branding lives in
one place (`src/config/brand.ts`, overridable by `NEXT_PUBLIC_APP_NAME`); each
tenant's own business name, logo and details live in organization settings.
No screen hard-codes a company name.

Evidence behind these decisions: [`product-research.md`](product-research.md).
Data model: [`firestore-schema.md`](firestore-schema.md). Delivery order:
[`implementation-plan.md`](implementation-plan.md).

---

## 1. Users and jobs

| Persona | Device | Main jobs |
| --- | --- | --- |
| **Owner** | laptop, phone | Is the business healthy? Revenue, utilisation, top staff, expenses, settings, users. |
| **Branch manager** | desktop | Run the day: calendar, staff schedules, attendance, stock, branch reports. |
| **Receptionist** | desktop/tablet at the desk | Book, move and check in appointments fast; find clients by phone; take walk-ins. |
| **Cashier** | desktop/tablet | Check out appointments and walk-ins, split payments, sell products and gift cards, print receipts. |
| **Employee (stylist, therapist)** | phone | See today's schedule, clock in/out, look up a client's notes before a service. |
| **Accountant** | laptop | Sales, VAT, payment methods, expenses, exports. |

Design consequence: the front desk and cashier are **not** power users. Every
frequent action is one or two clicks from where they already are, labelled in
plain words, and forgiving (undo-able or confirmed).

## 2. Product principles

1. **The calendar is home for the front desk; the dashboard is home for the
   owner.** Default landing depends on the role.
2. **Never leave the context.** Booking, editing and checking out an
   appointment happen in drawers over the calendar, not on separate pages.
3. **One filter bar everywhere.** Date range, branch and staff filters look
   and behave the same on every list and report.
4. **Calm by default.** Neutral surfaces, one accent colour, status colours
   only where they carry meaning, generous spacing, 14–15 px body text,
   no decorative gradients.
5. **Bilingual and RTL-correct.** Arabic mode mirrors the whole layout
   (logical CSS properties throughout); numbers use Western digits, as is
   usual in the UAE; catalog items have optional Arabic names.
6. **Security is not a UI feature.** Hidden buttons are a convenience; every
   permission is enforced on the server and in Firestore rules.
7. **Honest states.** Every screen has loading (skeletons), empty (with the
   next useful action), error (with retry) and success (toast) states.

## 3. Information architecture

Collapsible sidebar with sections; top bar with branch switcher, global search
(⌘K / Ctrl K), language switcher, theme, notifications and account menu.

```
Overview      Dashboard
Front desk    Appointments · Checkout (POS) · Clients
Business      Sales · Staff · Services · Inventory · Expenses
Growth        Reports · Marketing
Admin         Settings
```

Items are shown only if the user has the permission; routes and actions are
also guarded server-side.

## 4. Modules

### 4.1 Dashboard
- Page-level date range: Today, Yesterday, This week, Last week, This month,
  Last month, Custom. Branch follows the global branch switcher.
- KPIs with comparison to the previous equivalent period: revenue, appointments,
  clients served, new clients, average ticket, staff utilisation
  (booked minutes ÷ scheduled minutes).
- Revenue chart (daily bars; services vs products), appointment status
  breakdown, top services, top staff (revenue, services, tips, commission),
  upcoming appointments (today), recent transactions.
- Data comes live from Firestore through the server; no mock numbers.

### 4.2 Appointments
- **Views:** Day (one column per staff member, ordered by staff sort order —
  observed in the reference), Week (days as columns, for one staff member or
  all), Staff (one person, several days), List (filterable table).
- **Grid:** 15-minute slots by default (configurable), business hours shaded,
  staff off-hours and blocked times hatched, current-time line, status
  colour on each card.
- **Booking drawer** (the fastest path in the product):
  1. Client: search by name/phone/email, or create inline (name + phone), or
     walk-in.
  2. Lines: service → staff (filtered to staff who perform it) → start time
     (defaults to the slot clicked or to the end of the previous line) →
     duration and price prefilled from the service, both editable →
     optional line discount. Add more lines; each line may have a different
     staff member, start, duration and price. Example: *Sarah — Haircut with
     Sara 10:00 · Hair Colour with Maria 10:45 · Nails with Lina 10:45.*
  3. Branch, notes, source. Save.
  Clicking an empty slot opens the drawer with staff and time filled in.
- **Conflict handling:** overlapping bookings for the same staff member are
  warned about; allowed only if the setting permits overlap.
- **Lifecycle:** booked → confirmed → checked in → in service → completed;
  cancelled (with reason) and no-show are exits. Status actions are on the
  appointment card popover and in the drawer.
- **Reschedule:** drag a card to another time or staff column (single-line
  appointments; multi-line appointments move as a block), or edit in the
  drawer. Every move is audited.
- **Blocked time:** reserve a staff member's time (break, training).
- **Checkout** from a completed/checked-in appointment opens POS prefilled
  with its lines and staff.

### 4.3 Clients
- Directory with search (name, phone, email), filters (tag, last visit,
  status), sort, pagination, CSV export, bulk tag/archive.
- **Profile** — header with name, phone (tap to call / WhatsApp link),
  tags, quick actions (Book, Checkout, Edit). Stat strip: lifetime spend,
  visits, average spend, last visit, next appointment, cancellations,
  no-shows. Tabs: Overview (pinned notes, upcoming, recent activity,
  active packages/memberships), Appointments, Transactions, Packages,
  Memberships, Notes, Activity (audit timeline).
- Fields: first/last name, phone (+971 default), email, birthday, gender
  (optional, configurable), source, nationality, preferred staff, tags,
  notes, WhatsApp/marketing consent.
- Archive instead of delete; duplicates prevented on normalised phone.

### 4.4 Staff
- List with photo, position, branches, status, services count, and
  document-expiry warnings (passport/visa — observed as a UAE need).
- Record: name, photo, phone, email, position, branches, status, joining
  date, colour, bookable, services performed, weekly schedule (one shift per
  weekday with optional break), commission (service %, product %), HR
  (date of birth, nationality, passport/visa expiry).
- Profile tabs: Today (schedule), Upcoming, Completed, Sales & commission,
  Attendance, Leave, Performance (utilisation, average ticket, rebooking).
- Staff records are separate from login users; a user can be linked to a
  staff record to see their own calendar and clock in.

### 4.5 Services
- Categories and services, both drag-orderable; optional Arabic names.
- Service: category, name, description, duration, price, tax behaviour
  (default rate / specific rate / exempt), available branches, eligible
  staff, online-bookable, active.
- Prices are **tax-inclusive by default** (observed; UAE norm) — an org
  setting switches to tax-exclusive.

### 4.6 Checkout (POS)
- One screen: catalog (services, products, packages, memberships, gift
  cards; search + category chips) on one side, ticket on the other.
- Select client (search / walk-in); lines carry staff, quantity, price
  (editable with `apply_discounts`), line discount.
- Order discount (manual % / amount, or a discount code), tip with staff.
- Totals: subtotal, discount, VAT, total, paid, balance.
- Tender: cash, card, bank transfer, gift card (by code, checks balance),
  package credit, custom methods; **split payment** by adding tenders
  until the balance is zero (e.g. AED 100 cash + AED 250 card). Cash
  change calculation.
- Issuing the invoice atomically: number, stock decrement, gift card and
  package balances, client stats, commissions, appointment completion,
  audit entry. Then a printable receipt (A4/thermal-friendly), reprint any
  time.
- Unpaid balance allowed only if the setting permits client debt.

### 4.7 Sales & transactions
- Table: invoice, date, client, branch, staff, subtotal, discount, VAT,
  total, payment methods, status. Filters: date, branch, staff, client,
  payment method, status. Search by invoice number.
- Detail drawer/page: lines, payments, refunds, receipt, audit trail.
  Actions: refund (full/partial, with reason, restocks products), void
  (unpaid only), record payment against a balance.

### 4.8 Expenses
- Fields: category (configurable), amount, VAT, date, branch, vendor,
  payment method, description, attachment (receipt image/PDF, stored in
  Firebase Storage). List with filters and totals by category.

### 4.9 Inventory
- Products: SKU, barcode, name, brand, category, supplier, cost, price,
  tax, min stock, usage (retail/professional), per-branch quantity.
- Movements: purchase, sale (automatic from POS), adjustment, transfer
  between branches, return, internal use — each with a ledger entry and
  resulting balance. Low-stock badges and notifications.
- Suppliers list.

### 4.10 Packages
- Definitions: a bundle of service sessions (e.g. 10 massages) or a
  monetary credit (e.g. AED 1,000), price, validity.
- Client packages: purchased, used, remaining, expiry; redeemed at
  checkout as a payment method or zero-priced line.

### 4.11 Memberships
- Plans: price per period, service discount %, product discount %,
  included services per period (e.g. Gold — AED 300/month, 2 blow-dries,
  10% off services, 5% off products).
- Client memberships: start, end, status; discounts applied automatically
  at checkout for the member.

### 4.12 Gift cards
- Issue (sold at POS or free with permission): code, initial value,
  balance, expiry, purchaser, recipient, message. Redeem at checkout;
  history of redemptions.

### 4.13 Commissions
- Rules by item type, staff, service, with priority (most specific wins);
  default rates from the staff record. Computed and stored per invoice
  line. Report by staff and period.

### 4.14 Attendance & shifts
- Weekly schedule per staff member; leave requests; time clock (clock in,
  break, clock out) from the staff member's own login or the manager's
  attendance board. Managers can correct records; every correction keeps
  the before/after, reason and author.

### 4.15 Reports
One report centre with a shared filter bar (date range, branch, staff) and
CSV export: Revenue, Transactions, Services, Clients (new/returning),
Staff performance, Commissions, Appointments (incl. cancellations and
no-shows), Expenses, Profit estimate (revenue − expenses − product cost),
Products & inventory, Packages & memberships, Payment methods, VAT.

### 4.16 Multi-branch
Every branch-scoped record carries `branchId`. The top bar branch switcher
offers the branches the user may access plus "All branches" for users with
access to more than one. Users have all-branch or specific-branch access.

### 4.17 Roles & permissions
Default roles: Owner, Admin, Branch Manager, Receptionist, Cashier, Employee,
Accountant — editable (except Owner), plus custom roles. Permission matrix
grouped by module. Enforced in Server Actions, route guards and Firestore
rules.

### 4.18 Settings
Business · Branches · Users · Roles · Services (categories) · Taxes ·
Payments (methods) · Appointments · Notifications · Receipts · Appearance ·
Language · Data (demo data, export) · Audit log.

### 4.19 Marketing (v1 scope)
Discount codes and promotions, and audiences (birthdays this month, lapsed
clients, top spenders) with CSV export. Sending messages is out of scope for
v1 — no messages are sent to clients by the system.

## 5. Cross-cutting

- **Global search (⌘K):** clients, appointments (today/upcoming), staff,
  invoices; plus navigation commands.
- **Tables:** search, filters, sort, pagination, column visibility, row
  selection with bulk actions where useful.
- **Feedback:** toasts for success/failure, confirmation dialogs for
  destructive actions, drawers for create/edit, skeletons while loading.
- **Accessibility:** labelled controls, full keyboard navigation, visible
  focus rings, AA contrast, ARIA on custom widgets (calendar grid,
  combobox, dialogs).
- **Responsive:** desktop and tablet first; on phones, the calendar becomes
  a single-staff agenda, tables become cards, POS stacks catalog above the
  ticket.
- **Audit log:** every write (see schema doc).
- **Localisation:** `en` and `ar` dictionaries; `dir="rtl"` for Arabic;
  currency AED; time zone Asia/Dubai (per branch configurable).

## 6. Authentication
Email/password with Firebase Authentication; login, forgot password, reset
password (custom page handling Firebase action codes), logout, server
session cookies (httpOnly, 5 days, revocation checked), protected routes.
The provider layer allows adding Google and phone sign-in later without
touching the session model. New businesses sign up and go through a short
onboarding (business name, first branch) that seeds roles, settings and
optional demo data.

## 7. Out of scope for v1
Online booking site for clients, WhatsApp/SMS/e-mail sending, payment
gateway integration, double-entry accounting, payroll, loyalty points and
wallets, self-checkout kiosk, native mobile apps. The data model leaves room
for each.
