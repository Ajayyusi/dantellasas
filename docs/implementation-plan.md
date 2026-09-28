# Implementation plan

Order follows the brief. Each step ends with typecheck, lint and the relevant
tests passing, and a commit.

| # | Step | Deliverables | Done when |
| --- | --- | --- | --- |
| 1 | Research | `product-research.md` (passes 1–2 from the reference, synthesis) | Evidence recorded, unverified items marked |
| 2 | Specs | `product-spec.md`, `firestore-schema.md`, this plan | Reviewed against the brief |
| 3 | Architecture | Folder structure, config, env validation, brand config, money/date/i18n libraries | App boots, `npm run typecheck` clean |
| 4 | Firebase | `firebase.json` (Firestore, Storage, emulators), `apphosting.yaml`, client/admin SDK modules, `.env.example`, seed script | Emulators run; seed creates a demo tenant |
| 5 | Auth & security | Login, forgot/reset password, logout, session cookies, signup + onboarding, tenant context, permission catalogue, `firestore.rules`, `storage.rules`, rules tests | Rules tests pass: cross-tenant reads denied, permission-aware reads, client writes denied |
| 6 | Shell & design system | Tokens (light/dark), shadcn/ui primitives, sidebar, top bar, branch switcher, language switcher, ⌘K search, data table, page header, empty/error/loading states, toasts | Shell works in en/ar, desktop/tablet/phone |
| 7 | Core modules | Dashboard, Appointments (day/week/staff/list, booking drawer, lifecycle, drag-reschedule, blocked time), Clients, Staff, Services | Create/edit/archive/search/filter verified against the emulator |
| 8 | POS & sales | Checkout, split tender, receipts, transactions list/detail, refunds, void | A sale updates stock, balances, stats, commission, audit |
| 9 | Finance & reports | Expenses (+ attachments), reports centre with CSV export, commissions | Reports reconcile with seeded data |
| 10 | Remaining modules | Inventory & suppliers, packages, memberships, gift cards, discounts, attendance & leave, marketing audiences, settings sections, audit log viewer | Each module passes its checklist |
| 11 | Polish | Motion, focus, empty states, copy (en/ar), responsive passes | Manual review of every screen in both languages |
| 12 | Test | Unit tests (money, tax, commissions, status machine, search tokens), rules tests, browser walkthrough of every workflow and role | No console errors; all flows pass |
| 13 | GitHub | README, `.env.example`, clean history on `main` | Pushed |
| 14 | Deploy | Firebase project, Firestore rules + indexes, App Hosting backend from `main` | Production URL serves the app with real Firestore data |

## Module checklist (applied before calling a module done)
1. Data requirements and Firestore documents defined in the schema doc.
2. Workflow walked through end to end.
3. Permissions enforced in the action, the page guard and the rules.
4. Edge cases (empty values, duplicates, concurrent edits, deleted
   references) handled.
5. Empty, loading, error and success states present.
6. Responsive layout checked at 390 px, 768 px, 1280 px.
7. Create, edit, archive, search, filter, refresh, navigate away and back —
   data persists in Firestore.

## Steps that need the account owner
These cannot be done from the build container and are listed with exact
clicks in the README (§ Deployment):
1. Create the Firebase project and upgrade it to the **Blaze** plan
   (App Hosting requires billing).
2. Enable **Email/Password** sign-in in Firebase Authentication.
3. Create the **App Hosting backend**, connecting GitHub
   `Ajayyusi/dantellasas`, live branch `main` (authorises the Firebase
   GitHub app).
4. Authorise the Firebase CLI once (`firebase login`) — or provide a CI
   token — so rules and indexes can be deployed.
