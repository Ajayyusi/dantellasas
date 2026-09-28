# Salon Platform

Multi-branch salon management platform — **infrastructure scaffold**.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Firebase (Auth, Firestore, Admin SDK).

## Status

- ✅ Project config, Tailwind + shadcn/ui base, env templates
- ✅ Firebase client/admin modules, session-cookie auth, route protection
- ✅ Multi-tenant org → branch model, RBAC guards, Firestore rules
- ⏸ Product UI (dashboard, appointments, POS, CRM) — blocked on
  [product research](docs/product-research.md) verification

## Getting started

```bash
npm install
cp .env.example .env.local        # fill in Firebase values
cp .firebaserc.example .firebaserc
npm run emulators                 # optional, in another terminal
npm run dev
```

Scripts: `dev`, `build`, `lint`, `typecheck`, `emulators`, `deploy:rules`.

## Layout

```
src/
  app/
    (auth)/login/            dev-placeholder sign-in
    (app)/orgs/              org picker
    (app)/o/[orgId]/         tenant boundary (requireOrg)
      b/[branchId]/          branch workspace root (requireBranch)
    api/auth/session/        ID token → session cookie
    api/organizations/       list / create orgs
  components/ui/             shadcn/ui primitives
  components/providers/      AuthProvider
  lib/firebase/              client.ts (browser) · admin.ts (server-only)
  lib/auth/                  session helpers
  lib/tenancy/               types, paths, roles, guards, service
  proxy.ts                   optimistic auth redirect
firestore.rules              deny-by-default multi-tenant rules
docs/                        research, architecture, ADRs
```

Add more shadcn components with `npx shadcn@latest add <component>`.
