# Dantella CRM

A multi-branch salon and spa management platform covering appointments,
clients, checkout, sales, staff, inventory, packages, reports and settings. It
runs in English and Arabic, with full right-to-left layout for Arabic.

"Dantella CRM" is a working name. The platform name comes from
`NEXT_PUBLIC_APP_NAME`. Each business stores its own name, logo, accent colour,
tax, payment methods and receipt text in its organization settings. One
deployment can therefore serve many salons as a multi-tenant SaaS.

## Modules

| Area | What it does |
| --- | --- |
| Dashboard | Net sales, average sale, appointments and new clients, each compared with the previous period. Also shows the revenue trend, appointment status breakdown, today's schedule, and top services and team members |
| Appointments | Day, week, staff and list views, with drag-and-drop rescheduling. A booking can hold several services, each with its own staff, duration and price. Status runs booked → confirmed → checked in → in service → completed, or ends as cancelled (with a reason) or no-show. Also supports blocked time and live updates |
| Clients | Search by name, phone or email. Profiles show history, notes, tags, packages and memberships |
| Checkout (POS) | Sells services, products, packages, memberships and gift cards, with staff set per line. Supports manual, code and member discounts, tips and package redemption. Split payments across cash (with change), card, bank transfer, gift card and package credit. A balance can be left due |
| Sales | Invoice list with filters and CSV export, and an invoice detail page. Refunds are numbered credit notes that reverse stock, gift-card balance and commission. Unpaid invoices can be voided and later payments recorded. Prints a simplified tax invoice |
| Staff | Profiles, schedules, services performed, commission rates, and documents with expiry alerts. Attendance covers clock in/out and breaks, and corrections keep an audit history. Also handles leave |
| Services | Categories and services with drag-to-reorder, per-branch availability and a tax setting per item |
| Inventory | Products and suppliers. Stock can be received, adjusted, transferred or used internally, and every change is kept as a stock movement. Includes low-stock alerts |
| Packages & gift cards | Service and credit packages, membership plans, gift cards, discount codes and commission rules |
| Expenses | Categories, suppliers, VAT and receipt attachments |
| Reports | Revenue, services, staff, commissions, clients, appointments, expenses and profit, products, packages, payment methods and VAT. Every report exports to CSV |
| Marketing | Client audiences (birthdays, lapsed, top spenders) and discount performance |
| Settings | Business, branches, users, roles and permissions, taxes, payment methods, appointments, receipts, appearance, language, audit log and demo data |

## Stack

- **Next.js 16**: App Router, React 19, Server Components, Server Actions, Turbopack.
- **TypeScript** (strict) and **Tailwind CSS v4**, with CSS-variable design tokens.
- **UI**: shadcn/ui-style primitives on **Radix UI**, plus:
  - **Lucide** icons
  - **cmdk** for the ⌘K search
  - **sonner** toasts
  - **TanStack Table**
  - **dnd-kit** for drag and drop
  - **recharts** for charts
- **Firebase**: Authentication (email/password), Firestore and Cloud Storage, with the Admin SDK on the server.
- **Firebase App Hosting** for deployment; it builds from the GitHub `main` branch.
- **Other libraries**:
  - **zod** for validation
  - **@date-fns/tz** for dates in the business's time zone
  - **Vitest** for unit tests and security-rule tests

## Architecture

```
src/
  app/
    (auth)/            login, sign-up, forgot / reset password, email action handler
    (app)/             signed-in product (shell + one folder per module)
    (print)/           receipt pages without the app shell
    api/auth/session/  exchanges a fresh ID token for an httpOnly session cookie
    onboarding/        create the first organization
  features/<module>/   schema.ts (zod) · queries.ts (server reads) · actions.ts
                       (server actions) · *-service.ts (transactions) · mappers.ts
                       (Firestore → DTO) · components/ (client UI)
  components/ui/       design-system primitives
  components/common/   page header, states, stat card, date-range filter, …
  components/shell/    sidebar, top bar, branch switcher, ⌘K search
  lib/                 firebase, auth, tenancy, permissions, i18n, money, dates, audit
  proxy.ts             redirects signed-out visitors (cookie presence only)
firestore.rules        tenant isolation (deny by default)
storage.rules          tenant file isolation
tests/                 unit tests and Firestore/Storage rules tests
docs/                  research, product spec, schema, implementation plan, architecture
```

Key decisions (details in [`docs/architecture`](docs/architecture)):

- **Tenancy.**
  - Everything a business owns lives under `organizations/{orgId}/…`.
  - Each member has a document at `organizations/{orgId}/members/{uid}`. It holds their role, permissions, the branches they can use and their linked staff record.
  - Records carry a `branchId` field. The branch switcher, including "All branches", only narrows what the server returns.
- **Security in depth.**
  - Every read and write goes through server code. That code re-checks the session, organization, permissions and branch access each time.
  - The browser SDK is read-only and used only for the live calendar. All client writes are denied.
  - `firestore.rules` enforces membership, permissions and branch scope independently. It also limits staff to their own appointments.
  - Hiding UI is never the only guard.
- **Roles and permissions.**
  - Seven built-in roles: owner, admin, branch manager, receptionist, cashier, employee (stylist or therapist) and accountant. Businesses can also create custom roles.
  - Permissions are configured in Settings. They are copied onto each member document so the rules can check them cheaply.
- **Money and tax.**
  - Amounts are stored as integers in minor units (fils), and rates in basis points.
  - VAT is configured per organization: tax-inclusive or exclusive prices, multiple rates, and per-item overrides or exemptions.
  - Gift cards and credit packages are not taxed when sold; they are taxed when redeemed.
  - Invoices and credit notes get their numbers from transactional counters. An invoice is never edited after payment.
- **Audit.** Key actions write an audit entry in the same transaction as the change. These include sales, refunds, voids, price and permission changes, attendance corrections and deletions.
- **i18n.**
  - Message catalogues are typed with `defineMessages({ en, ar })`, and TypeScript checks that English and Arabic have the same keys.
  - Includes a language switcher and `dir="rtl"` for Arabic. Layout uses logical CSS properties throughout.
  - Numbers and dates are formatted for the current language.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit real values.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | build + runtime | Platform name shown in the UI |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | build + runtime | `en` or `ar` for first-time visitors |
| `NEXT_PUBLIC_FIREBASE_*` | build | Web SDK config. **Set automatically on App Hosting** from `FIREBASE_WEBAPP_CONFIG` |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | local | `true` to use the emulators |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST` | local | Admin SDK emulator targets |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | local only | Service-account credentials for running against a real project locally. Leave empty on App Hosting (it uses the backend's service account) |
| `SESSION_COOKIE_MAX_AGE_DAYS` | runtime | Session length (1–14 days) |
| `ALLOW_DEMO_DATA` | runtime | Shows "Load demo data" in Settings › Data |

## Local development

Requirements: Node 20+ and Java 21 (for the Firebase emulators).

```bash
npm install
cp .env.example .env.local
# In .env.local set: NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true, the three *_EMULATOR_HOST lines,
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-dantella and METADATA_SERVER_DETECTION=none

npm run emulators      # terminal 1 — Auth, Firestore, Storage; emulator UI at :4000; data persists in .emulator-data
npm run seed           # optional — demo business with ~60 days of activity and one login per role
npm run dev            # terminal 2 — http://localhost:3000
```

`npm run seed` prints the demo logins: owner, branch manager, receptionist,
cashier, employee and accountant (all `@dantella.app`, password
`Dantella#2026`). You can also sign up in the app instead; onboarding creates an
organization and can load the same demo data.

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` · `npm run typecheck` | ESLint (including the React Compiler rules) · TypeScript |
| `npm test` | Unit tests: pricing, payments, commissions, dates, appointments, dashboard, reports |
| `npm run test:rules` | Firestore and Storage security-rule tests against the emulator |
| `npm run deploy:rules` | Deploy Firestore rules, indexes and Storage rules |

## Firebase setup (production)

1. Create a Firebase project and upgrade it to the **Blaze** plan (App Hosting requires it).
2. Set up **Authentication**:
   1. Under **Sign-in method**, enable **Email/Password**.
   2. Under **Templates → Password reset → Customize action URL**, set `https://<your-domain>/auth/action` so reset links open the app's own page.
   3. Under **Settings → Authorized domains**, add your App Hosting domain.
3. **Firestore:** create the database in production mode, in a region near your
   users (for example `me-central1` or `europe-west1`).
4. **Storage:** create the default bucket.
5. Deploy rules and indexes from this repo:
   ```bash
   cp .firebaserc.example .firebaserc   # set your project id
   npx firebase login
   npm run deploy:rules
   ```

## Deployment (Firebase App Hosting)

1. In the Firebase console, open **App Hosting → Get started**. Connect GitHub,
   pick this repository with root directory `/` and live branch **`main`**, and
   turn automatic rollouts on.
2. App Hosting reads [`apphosting.yaml`](apphosting.yaml) for instance sizing and
   non-secret environment variables.
   - The Web SDK config is injected automatically.
   - The Admin SDK uses the backend's service account.
   - No keys are stored anywhere.
3. Every push to `main` builds and rolls out. Watch progress under
   **App Hosting → your backend → Rollouts**.

## Database

The full model is in [`docs/firestore-schema.md`](docs/firestore-schema.md). In
short:

```
users/{uid}                              profile, preferred language, last org
  orgs/{orgId}                           index of the user's organizations
organizations/{orgId}                    name, plan, settings (business, tax, payments, receipts, appearance…)
  members/{uid}                          role, permissions[], branch access, staff link, status
  roles/{roleId}                         built-in and custom roles
  branches/{branchId}
  clients/{clientId} (+ notes/)          search tokens, stats, consent
  staff/{staffId}                        schedule, services, commission, documents
  serviceCategories/, services/
  appointments/, blockedTimes/
  transactions/                          invoices with items, payments, credit notes
  counters/{invoice|creditNote}
  products/, inventoryMovements/, suppliers/, productCategories/
  packages/, clientPackages/, membershipPlans/, clientMemberships/, giftCards/, discounts/
  commissionRules/, expenses/, expenseCategories/
  attendance/, leave/
  auditLogs/
```

Composite indexes are in [`firestore.indexes.json`](firestore.indexes.json).
