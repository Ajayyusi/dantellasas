# Design system

The Dantella look ("A2 · Soft"): light, calm and modern — near-white cards on a
soft grey canvas, fine borders instead of heavy shadows, one rose accent used
only where it matters (the main action, the current item, today), and quiet
neutral greys for everything else. Reuse the pieces below instead of styling
screens from scratch.

## Tokens (`src/app/globals.css`)

- **Surfaces**: `bg-background` (canvas `#f7f6f6`), `bg-card` (white cards with
  a 1px `border`), `bg-muted` (quiet fills: search field, table headers, hover
  rows, empty-state tiles). `bg-brand-wash` is a flat rose tint kept for the
  sign-in panel. No gradients on surfaces, bars or text; the dark theme is a
  neutral charcoal.
- **Accent**: `primary` (rose `#a8406a`, AA on white), `primary-soft` (tinted
  fills: selected nav item, soft buttons, active chips). A tenant accent from
  Settings → Appearance replaces `--primary` at runtime — use the token, never
  a hex. Earlier default accents resolve to the current default in
  `resolveSettings`.
- **Gold**: the `gold*` tokens remain for older call sites but are rose tints
  now; prefer `primary` / `primary-soft` in new code.
- **Status**: `var(--status-<appointment status>)` for dots and
  `var(--status-<status>-fg)` for the matching text; `success`, `warning`,
  `destructive`, `info`. Charts: `chart-1` (accent) … `chart-6`, and
  `chart-muted` for de-emphasised bars (the current day is highlighted in
  `chart-1`, the rest stay `chart-muted`).
- **Type**: one family — Plus Jakarta Sans with Readex Pro for Arabic
  (`font-sans`; `font-display` is the same face, tighter, with tabular
  figures). Page titles 28–30px bold, section titles 17–19px, card titles
  16–17px semibold, KPI figures ≤ 28px, body 14–15px, table cells 14px with
  12px column headings. Use
  `tabular` for numbers. Uppercase labels only for sidebar/nav section
  headings (11px, `tracking-[0.08em]`).
- **Shape & depth**: cards `rounded-2xl` + `border`, no shadow at rest;
  controls `rounded-lg` (40px default height); menus and popovers
  `shadow-md`; `hover-lift` (1px lift + `shadow-sm`) only for clickable cards.
- **Motion**: `animate-fade-up` on entry, `motion/react` for shared-layout
  highlights; everything respects reduced motion (`MotionConfig` in the
  providers).

## Components

| Need | Use |
| --- | --- |
| Page shell | `PageContainer` + `PageHeader` (title, description, actions) |
| Titled card | `SectionCard` (`components/common/page-header.tsx`) or `Card` |
| KPI | `StatCard` — quiet label with a small icon, figure auto-sizes to the card, optional delta chip |
| Person header | `ProfileHero` + `HeroChip` + `profileAvatarClass` (client, staff) |
| Status | `StatusPill` (dot + coloured text on a muted pill) or `Badge` variants (`success`, `warning`, `danger`, `primary`…) |
| Tables | `DataTable` — search, facets, sort, CSV, bulk actions, `mobileCard` for phones; hide rarely needed columns with `initialVisibility` rather than letting tables scroll at desktop widths |
| Empty / error | `EmptyState`, `ErrorState` (`components/common/states.tsx`) |
| Loading | `Skeleton`, `PageSkeleton` variants |
| Numbers that animate | `CountUp` (`components/motion/count-up.tsx`) |
| Brand | `BrandMark`, `BrandEmblem` (`components/brand-mark.tsx`) |

## Layout rules

- Check 1440 and 1280 desktop, 768 tablet and 390 phone, in English and
  Arabic. No page may scroll sideways; long names truncate, amounts don't.
- Below `lg` the shell shows a floating tab bar with a centre "+" for the
  quick actions (book, sell, add a client): keep sticky bars and toasts above
  it (`bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-0`,
  `--toast-offset-bottom`).
- Components that sit in columns of varying width size themselves with
  container queries (`@container`, `@md:`, `cqi`) rather than viewport
  breakpoints — see `StatCard`, `KpiGrid`, `StatusDonut`.
- Horizontal scrollers inside a height-limited flex column need `shrink-0`,
  or they collapse and clip their content.
- SVG `id`s (gradients, clip paths) must be unique per instance (`useId()`):
  a shared id resolves to the first copy, which may be hidden.
