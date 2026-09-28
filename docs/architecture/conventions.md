# Code conventions

How a feature is put together in Dantella CRM. Follow the Services module
(`src/features/services`, `src/app/(app)/services`) as the reference
implementation.

## Next.js version

This is Next.js 16 (App Router, Turbopack). APIs differ from older versions —
read `node_modules/next/dist/docs/` before using an unfamiliar API.
`params`/`searchParams`/`cookies()` are async; `PageProps<"/route">` is a
global type; middleware is `src/proxy.ts`; use `forbidden()` for 403s.

## Layout of a feature

```
src/features/<module>/
  mappers.ts      server-only: Firestore document → DTO (src/lib/types.ts)
  queries.ts      server-only: reads (the data-access layer), React cache()
  schema.ts       Zod input schemas (shared by client forms and actions)
  service.ts      server-only helpers shared by several actions (optional)
  actions.ts      "use server": mutations built with action()
  components/     client components for this module
src/app/(app)/<route>/page.tsx   server component: guard → query → render view
src/lib/i18n/messages/<module>.ts   en + ar messages (defineMessages)
```

## Rules

1. **Every page starts with a guard.** `const ctx = await requirePagePermission("perm")`
   (renders the 403 page if missing) or `getAppContext()` when any member may
   view it. Never query Firestore before the guard.
2. **Every mutation is an `action()`** from `src/lib/actions.ts`:
   `action({ schema, permission }, async (input, ctx) => …)`. It checks the
   session, tenant and permission, validates with Zod, maps thrown
   `fail("errors.x")` to a translated toast, and revalidates. Extra checks
   (e.g. edit vs. create) go inside the handler: `if (!can(ctx, "edit_customers")) fail("errors.forbidden")`.
3. **Tenant isolation:** always go through `orgCol(ctx.org.id, "<collection>")`
   / `orgDoc(...)` from `src/lib/db`. Never build paths from user input.
4. **Branch scoping:** branch-scoped reads filter by `ctx.scopeBranchIds`
   (selected branch or all accessible). Writes use `writeBranchId(ctx, requested)`
   and must reject branches the member can't access (`canAccessBranch`).
5. **Audit every write** with `audit(ctx, { action, entity, entityId, summary, changes? }, batchOrTx)`
   in the same batch/transaction. Action names: `<entity>.<verb>` (e.g.
   `expense.created`, `product.updated`, `stock.adjusted`).
6. **Money** is integer minor units (`priceMinor`), rates are basis points
   (`rateBps`). Use `MoneyInput`, `useOrg().money(minor)`, and helpers in
   `src/lib/money.ts`. Never store floats.
7. **Dates**: store Firestore `Timestamp`s for instants and a `dateKey`
   (`YYYY-MM-DD`, business time zone) for anything listed by day. Helpers in
   `src/lib/dates.ts`; format with `useOrg().date(...)` / `useOrg().dateKey(...)`.
8. **DTOs only cross to the client.** Mappers convert Timestamps to ISO strings
   and apply defaults. Don't pass raw Firestore data to client components.
9. **i18n**: no hard-coded UI strings. Add keys to your module's messages file
   with both `en` and `ar` (the type system enforces parity) and register the
   module in `src/lib/i18n/messages/index.ts`. Use `useI18n().t("key")` in
   client components and `(await getI18n()).t("key")` in server components.
   Server error codes are translation keys (`errors.*`, `validation.*`).
10. **RTL**: use logical Tailwind utilities only — `ms-/me-/ps-/pe-/start-/end-/
    border-s/border-e/text-start/text-end`. Never `ml-/mr-/pl-/pr-/left-/right-`.
    Add `rtl-flip` to directional icons (chevrons, arrows).
11. **UI kit**: `src/components/ui/*` (shadcn/ui on Radix), `DataTable`
    (`src/components/data-table`), `PageContainer`/`PageHeader`,
    `EmptyState`/`ErrorState`, `ConfirmDialog`, `MultiSelect`, `MoneyInput`,
    `SortableList`, `useAction` (pending state + toasts + field errors).
    Create/edit happens in a `Sheet` (drawer) or `Dialog`, never a browser
    `alert/confirm`.
12. **States**: every screen has loading (route `loading.tsx` or skeletons),
    empty (with the next action), error (`error.tsx` / toast) and success
    (toast) states.
13. **Components stay small** (< ~300 lines). Split views into subcomponents.
14. **Permissions in the UI** are a convenience: hide buttons with
    `useOrg().can("perm")`, but the action must still check.

## Testing locally

```
npm run emulators          # terminal 1 (auth, firestore, storage)
npm run dev:emu            # terminal 2 (or `npm run dev` with .env.local)
npm run seed               # demo tenant + users for each role
npm run typecheck && npm run lint && npm test && npm run test:rules
```
