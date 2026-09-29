# Design system

The Dantella look: warm, light and calm — ivory and champagne surfaces, dusty
rose as the one accent, deep cocoa text, gold only for highlights (top items,
loyalty, premium). Reuse the pieces below instead of styling screens from
scratch.

## Tokens (`src/app/globals.css`)

- **Surfaces**: `bg-background` (ivory page), `bg-card` (near-white cards),
  `bg-muted` / `bg-champagne` (quiet fills), `bg-brand-wash` (rose/gold wash
  for heroes and login). Never use pure black or grey-heavy panels; the dark
  theme is a warm espresso.
- **Accent**: `primary` (dusty rose, AA on white), `primary-soft` (tinted
  fills, selected rows, soft buttons). A tenant accent from Settings →
  Appearance replaces `--primary` at runtime — use the token, never a hex.
- **Gold**: `gold`, `gold-soft`, `gold-foreground` for badges and ranking —
  sparingly.
- **Status**: `var(--status-<appointment status>)`, `success`, `warning`,
  `destructive`, `info`. `chart-1…6` for charts (rose, champagne, sage,
  dusty blue, mauve, taupe).
- **Type**: `font-display` (Cormorant Garamond / El Messiri) for page titles,
  hero names and big figures; `font-sans` (DM Sans / IBM Plex Sans Arabic)
  for everything else. Page titles 34–38px, section titles 20–24px, card
  titles 17–18px, body 15–16px, tables ≥ 14px. Use `tabular` for numbers.
- **Shape & depth**: cards `rounded-2xl` + `shadow-sm`, heroes `rounded-3xl`,
  controls `rounded-lg`/`rounded-xl`; `hover-lift` for clickable cards.
- **Motion**: `animate-fade-up` on entry, `motion/react` for shared-layout
  highlights; everything respects reduced motion (`MotionConfig` in the
  providers).

## Components

| Need | Use |
| --- | --- |
| Page shell | `PageContainer` + `PageHeader` (title, description, actions) |
| Titled card | `SectionCard` (`components/common/page-header.tsx`) or `Card` |
| KPI | `StatCard` — icon + tone, figure auto-sizes to the card, optional delta |
| Person header | `ProfileHero` + `HeroChip` + `profileAvatarClass` (client, staff) |
| Status | `StatusPill` (colour dot) or `Badge` variants (`success`, `warning`, `danger`, `gold`…) |
| Tables | `DataTable` — search, facets, sort, CSV, bulk actions, `mobileCard` for phones; hide rarely needed columns with `initialVisibility` rather than letting tables scroll at desktop widths |
| Empty / error | `EmptyState`, `ErrorState` (`components/common/states.tsx`) |
| Loading | `Skeleton`, `PageSkeleton` variants |
| Numbers that animate | `CountUp` (`components/motion/count-up.tsx`) |
| Brand | `BrandMark`, `BrandEmblem`, `Rosette` (`components/brand-mark.tsx`) |

## Layout rules

- Check 1440 and 1280 desktop, 768 tablet and 390 phone, in English and
  Arabic. No page may scroll sideways; long names truncate, amounts don't.
- Below `lg` the shell shows a floating tab bar: keep sticky bars and toasts
  above it (`bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-0`,
  `--toast-offset-bottom`).
- Components that sit in columns of varying width size themselves with
  container queries (`@container`, `@md:`, `cqi`) rather than viewport
  breakpoints — see `StatCard`, `KpiGrid`, `StatusDonut`.
- SVG `id`s (gradients, clip paths) must be unique per instance (`useId()`):
  a shared id resolves to the first copy, which may be hidden.
