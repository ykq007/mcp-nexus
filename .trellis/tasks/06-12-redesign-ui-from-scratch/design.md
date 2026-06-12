# Design — mcp-nexus UI, "Graphite & Cobalt"

> New visual system replacing the retired "Verdigris". Direction: **a precision
> instrument at rest.** Monochrome ink on clean neutral; a single cobalt blue
> that appears only where the operator acts. Calm, dense, exact — Vercel's
> stillness with Linear's precision. Console (`product`) + Landing (`brand`)
> share one language.

## 0. Decisions locked

- **Strategy:** Restrained, ink-forward. Surfaces are neutral; the mood lives in
  type + the single cobalt primary, never in a tinted background.
- **Default theme:** light. **Dark** is full first-class parity (operators on
  dark IDEs), toggled via `html[data-theme='dark']`.
- **Primary:** cobalt blue — actions, active nav, selection, focus **only**.
- **Accent:** copper — signal only (credit/quota warnings, the one landing
  highlight). Never decorative.
- **Type:** Geist Sans (all UI) + Geist Mono (data: keys, tokens, IDs,
  timestamps, metric numbers, code/snippets). One contrast axis (sans vs mono),
  not two similar sans.
- **CSS architecture:** vanilla CSS with a token layer (no Tailwind/CSS-in-JS
  migration — lowest risk, no new build deps). Split into
  `src/styles/{tokens,base,components}.css` + per-page sheets, replacing the
  single 1698-line `styles.css`. Landing keeps its own `tokens.css` importing the
  same values (or a shared package-level token file).

## 1. Color tokens (OKLCH)

> Values below are the locked design intent. Exact L/C are tuned during build to
> hit the contrast floors in §1.3 — **verify, don't assume.**

### 1.1 Light (default) — `html[data-theme='light']`

```css
html[data-theme='light'] {
  color-scheme: light;

  /* Surfaces — pure neutral, faintest cool. Mood is NOT in the bg. */
  --canvas:         oklch(0.986 0.001 255); /* app background */
  --surface-1:      oklch(1 0 0);           /* cards, panels (pure white) */
  --surface-2:      oklch(0.973 0.002 255); /* inputs, raised, hover */
  --surface-sunken: oklch(0.961 0.003 255); /* wells, code, table head */

  --border:         oklch(0.917 0.003 255);
  --border-strong:  oklch(0.852 0.005 255);

  --ink:            oklch(0.225 0.012 255); /* body  ~#16191d  ≥7:1 on white */
  --text-mid:       oklch(0.470 0.012 255); /* secondary       ≥4.5:1 */
  --text-low:       oklch(0.595 0.010 255); /* meta, large only ≥3:1 */

  /* Brand — cobalt, action/active/focus ONLY */
  --primary:        oklch(0.550 0.205 264);
  --primary-hover:  oklch(0.490 0.205 264);
  --primary-active: oklch(0.430 0.185 264);
  --primary-soft:   oklch(0.550 0.205 264 / 0.10); /* selected/tint bg */
  --on-primary:     oklch(1 0 0);
  --ring:           oklch(0.550 0.210 264 / 0.45);

  /* Accent — copper, SIGNAL ONLY */
  --accent:         oklch(0.560 0.130 52);
  --accent-soft:    oklch(0.560 0.130 52 / 0.12);
  --on-accent:      oklch(1 0 0);

  /* Status (distinct hues; always pair with icon/label, never color alone) */
  --success: oklch(0.530 0.120 158); --success-soft: oklch(0.530 0.120 158 / 0.12);
  --warning: oklch(0.650 0.130 72);  --warning-soft: oklch(0.650 0.130 72 / 0.14);
  --danger:  oklch(0.550 0.195 27);  --danger-soft:  oklch(0.550 0.195 27 / 0.12);
  --info:    oklch(0.550 0.120 245); --info-soft:    oklch(0.550 0.120 245 / 0.12);

  /* Status solid text-on-soft (darker variants for pill text) */
  --success-ink: oklch(0.430 0.110 158);
  --warning-ink: oklch(0.430 0.090 72);
  --danger-ink:  oklch(0.470 0.180 27);
  --info-ink:    oklch(0.460 0.130 245);
}
```

### 1.2 Dark (full parity) — `html[data-theme='dark']`

```css
html[data-theme='dark'] {
  color-scheme: dark;

  --canvas:         oklch(0.170 0.006 255);
  --surface-1:      oklch(0.218 0.007 255);
  --surface-2:      oklch(0.262 0.008 255);
  --surface-sunken: oklch(0.150 0.006 255);

  --border:         oklch(0.300 0.008 255);
  --border-strong:  oklch(0.400 0.010 255);

  --ink:            oklch(0.958 0.004 255);
  --text-mid:       oklch(0.715 0.010 255);
  --text-low:       oklch(0.560 0.010 255);

  --primary:        oklch(0.700 0.160 264); /* brighter to pop on dark */
  --primary-hover:  oklch(0.760 0.150 264);
  --primary-active: oklch(0.650 0.160 264);
  --primary-soft:   oklch(0.700 0.160 264 / 0.16);
  --on-primary:     oklch(0.180 0.040 264); /* near-black-blue on bright fill */
  --ring:           oklch(0.700 0.160 264 / 0.50);

  --accent:         oklch(0.720 0.130 55);
  --accent-soft:    oklch(0.720 0.130 55 / 0.18);
  --on-accent:      oklch(0.180 0.040 55);

  --success: oklch(0.700 0.140 158); --success-soft: oklch(0.700 0.140 158 / 0.18);
  --warning: oklch(0.770 0.140 72);  --warning-soft: oklch(0.770 0.140 72 / 0.18);
  --danger:  oklch(0.660 0.185 27);  --danger-soft:  oklch(0.660 0.185 27 / 0.20);
  --info:    oklch(0.700 0.120 245); --info-soft:    oklch(0.700 0.120 245 / 0.18);

  --success-ink: var(--success); --warning-ink: var(--warning);
  --danger-ink:  var(--danger);  --info-ink:    var(--info);
}
```

### 1.3 Color rules (enforced in audit)

- White text on the light cobalt fill; near-black-blue on the bright dark cobalt
  fill (Helmholtz-Kohlrausch — saturated mid fills always take white text).
- Status pills: `*-soft` bg + `*-ink` text + a small icon/shape. Never color-only.
- Accent (copper) reserved for signal — a credit/quota warning, one landing
  highlight. If it appears as decoration, it's wrong.
- Contrast floors verified in BOTH themes: body ≥4.5:1, large/meta ≥3:1,
  placeholders ≥4.5:1, focus ring clearly visible on every surface.

## 2. Typography

```css
--font-sans: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

- Self-host Geist + Geist Mono (the `geist` npm font package or `@fontsource`),
  `font-display: swap`, preload the two primary weights to avoid layout shift.
- Sans carries headings, labels, buttons, body. Mono is **data only** — keys,
  tokens, IDs, timestamps, metric values, code/config. (Deliberate line vs. the
  retired mono-everything look.)
- Fixed rem scale, ratio ≈1.2 (product). No fluid clamp in console. Landing may
  use ONE clamp hero (max ≤ 3.5rem, tracking ≥ -0.02em).

```css
--text-2xs:.6875rem; --text-xs:.75rem; --text-sm:.8125rem; --text-base:.875rem;
--text-md:.9375rem; --text-lg:1.0625rem; --text-xl:1.25rem; --text-2xl:1.5rem;
--text-3xl:1.875rem; --text-4xl:2.25rem;
--fw-normal:400; --fw-medium:500; --fw-semibold:600; --fw-bold:700;
--lh-tight:1.2; --lh-base:1.55; --lh-loose:1.7;
```

- `text-wrap: balance` on h1–h3; `text-wrap: pretty` on landing prose (cap 65–75ch).
- Tabular numerals (`font-variant-numeric: tabular-nums`) on all mono data.

## 3. Space, radius, elevation, motion

```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px;
--space-6:32px; --space-7:40px; --space-8:48px; --space-10:64px; --space-12:96px;

--radius-xs:4px; --radius-sm:6px; --radius:8px; --radius-lg:12px; --radius-pill:999px;

/* Depth via soft shadow + hairline, never glow */
--shadow-sm: 0 1px 2px oklch(0.2 0.02 255 / .06);
--shadow:    0 2px 8px oklch(0.2 0.02 255 / .08), 0 0 0 1px var(--border);
--shadow-lg: 0 12px 32px oklch(0.2 0.02 255 / .14), 0 0 0 1px var(--border);
--shadow-pop: 0 8px 24px oklch(0.2 0.02 255 / .18); /* menus/popovers */

--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--dur-fast:120ms; --dur:180ms; --dur-slow:240ms;

/* Semantic z-scale — never arbitrary 999 */
--z-dropdown:100; --z-sticky:200; --z-drawer:300; --z-backdrop:400;
--z-modal:500; --z-toast:600; --z-tooltip:700;
```

- Motion conveys state only (hover, focus, selection, reveal, toast,
  drawer/dialog enter). 120–240ms ease-out. **No page-load choreography in the
  console.** Landing may stagger one section's reveal over an already-visible
  default.
- `@media (prefers-reduced-motion: reduce)` → crossfade/instant for every
  transition. Reveals must never gate content visibility.

## 4. Component vocabulary (one shape across the whole app)

Every interactive element ships **default · hover · focus-visible · active ·
disabled · loading**; focus is always a visible `--ring`.

- **Button**: heights 28/32/36px (sm/base/lg). Variants: `primary` (cobalt fill,
  white text), `secondary` (surface-1 + border), `ghost` (transparent, hover
  surface-2), `danger` (danger fill or danger-soft+danger-ink for destructive).
  One radius (`--radius-sm`), one icon size, leading/trailing icon slots.
- **Input / select / textarea**: `--surface-2` fill, `--border`, cobalt focus
  ring, `--text-low` placeholder at ≥4.5:1. Identical vocabulary everywhere.
  Inline error text below in `--danger`.
- **DataTable** (console's primary surface — tune hardest): dense 40px rows,
  sticky header on `--surface-sunken`, row hover `--surface-2`, mono tabular
  numerals for data columns, optional left checkbox column, sortable headers with
  affordance, keyboard row focus, horizontal scroll on narrow / stacked-card
  fallback on mobile. Standard table toolbar: search + filters (left) / primary
  action (right); bulk-action bar slides in when rows selected.
- **Status pill**: `*-soft` bg + `*-ink` text + small icon. Sizes match table
  density. Used for key status, token status, usage outcome.
- **StatusMenu / ActionMenu**: rendered via Portal + `position: fixed` (escape
  table overflow clipping). ARIA menu/listbox, full keyboard nav, danger items.
- **KPI / metric**: number in Geist Mono, label in sans `--text-mid`, flat on a
  grid. NOT the gradient hero-metric template. Optional sparkline only if it adds
  signal.
- **Card / panel**: flat `--surface-1` + hairline border + `--shadow-sm`. Never
  nested cards, never side-stripe borders, never glass.
- **Dialog** (centered modal) + **Drawer** (right slide): backdrop, focus trap,
  Esc/Tab, scroll lock. Prefer Drawer for inspect-while-list and multi-field
  forms; Dialog for short confirms. Modals are a last resort — exhaust inline /
  drawer first.
- **Reveal control** (secrets): unified affordance for key reveal + token reveal.
  Masked → reveal → cleartext in a mono well + copy; token reveal adds the 30s
  countdown (visual bar + `aria-live`) and auto-clear on blur/hidden/timeout.
- **Toast**: bottom-right, semantic variant + icon, auto-dismiss, `aria-live`.
- **Skeleton** for content load; inline spinner only inside button actions.
- **Empty state**: teaches the interface (what it is + primary action), not
  "nothing here".

## 5. Layout

- **Console app shell**: top bar (`--nav-h:56px`) + left sidebar
  (`--sidebar-w:248px`, collapsible to 64px icon rail) + content
  (`max-width:1200px`, comfortable gutters). Sidebar: brand → 6 nav items
  (Overview, Keys, Tokens, Usage, Playground, Settings) → footer (connection +
  auth status, collapse toggle). Top bar: page title/subtitle, theme
  toggle, sign in/out. Mobile: sidebar → off-canvas or bottom nav (keep bottom
  nav for the 5 primary), tables stack.
- **Standard page frame**: header row (title + subtitle + primary action) →
  optional toolbar (search/filters) → content. Consistent vertical rhythm
  (`--space-6` between blocks). No per-page eyebrows, no 01/02/03 markers.
- **Landing**: centered ~1080px sections, generous rhythm, one cobalt-accented
  hero, copper used for a single highlight. No SaaS-cream, no gradient blobs, no
  per-section eyebrows, no hero-metric template.

## 6. Per-surface UX redesign (preserve all features in `research/functional-inventory.md`)

### Shell & global
- Sidebar refined per §5; connection/auth summary moves to a calm sidebar footer
  (mono, truncated, tooltip full). Theme toggle +
  sign-in/out in top bar. Keep mobile bottom nav.

### Overview
- Calm KPI row (Keys / Tokens / Usage — flat, mono numbers, click-through),
  then live metrics panel (RPM/RPH, active tokens/keys, unhealthy, Tavily
  credits, Brave $ est., recent errors), then recent-usage table (last 10) with
  "View all". Empty/first-run: a 3-step starter (1 Add a key → 2 Mint a token →
  3 Test it) replacing the generic onboarding card — teaches the product.

### Keys
- Provider switch via **segmented control (Tavily / Brave)** at the top instead of
  two long stacked sections — halves scroll, one mental model. Tavily view adds
  the credits/capacity KPIs + credits column + sync-all + bulk actions; Brave
  view hides credit-specific affordances. Unified DataTable + toolbar (search,
  status filter, sort, import/export menu, "Add key" primary). Bulk-action bar on
  selection. Create via **drawer** (label + key, `tvly-` validation, inline
  errors). Reveal + credits cells use the shared reveal/credits affordances.
  Keep `?create=1`, typed-DELETE confirms, import/export dialogs, pagination.

### Tokens (crown-jewel flow)
- DataTable: prefix+description, status pill, scope+rate, expires, created,
  actions (Reveal + ⋯ menu Configure/Revoke/Delete). Search + status segmented
  filter.
- **Create = guided drawer**, two clear steps: (1) configure (description, expiry
  presets+custom, all-tools vs restrict→tool-groups, optional rate limit) with a
  live summary of what this token will allow; (2) **reveal+wire-up**: cleartext
  in a mono well + copy, then the **setup snippet** (target segmented: curl /
  Docker / …) right there — so "mint a token → wire a client" is one continuous
  flow, not a hunt. Setup drawer remains reachable later (Configure client +
  `?setup=1`). Reveal keeps the 30s countdown + auto-clear. Keep revoke (soft) /
  delete (hard, typed), `?create=1`.

### Usage
- Filter bar (tool, outcome, token prefix debounced, date range) + "N events".
  Dense DataTable. Row → **detail drawer** (not modal) so the list stays visible
  while inspecting (timestamp, token prefix, upstream key id, latency, query,
  error, args JSON). 20/page pagination.

### Playground
- Two-pane: request (token sticky, tool selector, JSON params with validation) /
  response (status + duration + JSON viewer). History rail (time, tool, status,
  duration, load-params), clear. Keep MCP JSON-RPC session handling + sticky
  localStorage state.

### Settings
- Grouped sections: **Connection** (API base URL + Test Connection + auth status +
  sign in/out), **Server strategy** (key-selection strategy, search-source mode w/
  cost + availability warnings, research toggle — auth-gated), **Appearance &
  language** (theme, locale en/zh-CN). Each setting: current value + control +
  save where applicable, with toasts.

### Landing
- Navbar (brand + GitHub/Docs + Open Dashboard), hero (clear value prop + primary
  CTA into login, one cobalt accent + at most one copper highlight), features
  (NOT identical icon-card grid — vary layout/rhythm; lead with the real value:
  unified multi-provider keys, scoped client tokens, usage/cost observability,
  self-hosted on Workers), footer. AdminLoginModal preserved (token + remember +
  validate + `?next=` + `?login=1`, cross-tab sync). Same tokens/type as console.

## 7. Accessibility (AA, both themes) — non-negotiable

Contrast floors §1.3 verified in light + dark; visible focus ring on every
interactive element; full keyboard operation of menus/dialogs/drawers/tables/
command-palette; semantic landmarks + skip link; state never by color alone
(icon/label/shape); `prefers-reduced-motion` alternative for every animation;
reveals enhance an already-visible default (never gate visibility on a class
transition).

## 8. Bans (this project, on top of global absolute bans)

Retired Phosphor vocabulary (phosphor/lime glow, scanlines, signal-grid, terminal
green, mono-everything) AND retired Verdigris teal. Plus global bans: gradient
text, default glassmorphism, side-stripe borders, hero-metric template, identical
icon-card grids, per-section eyebrows, numbered section scaffolding, text overflow
at any breakpoint.
</content>
