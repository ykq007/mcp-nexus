# Design

> Visual system for `mcp-nexus` — Admin Console (product) + Landing (brand).
> Direction: **"Graphite & Cobalt"** — a precision instrument at rest.
> Monochrome ink on clean neutral; a single cobalt blue that appears only where
> the operator acts. Calm, dense, exact — Vercel's stillness with Linear's
> precision. Replaces the retired "Verdigris" (teal) and "Phosphor Ops"
> (terminal) looks (see `PRODUCT.md` anti-references).

## Theme

- **Strategy:** Restrained, ink-forward. Neutral surfaces; the mood lives in
  typography + the single cobalt primary, never in a tinted background.
- **Default light, true dark at full parity.** Toggle via `html[data-theme]`.
  WCAG AA in both.
- **Primary (cobalt):** actions, active nav, selection, focus — only.
- **Accent (copper):** signal only (credit/quota warnings, one landing
  highlight). Never decoration.
- **Mood:** calm, precise, infrastructure-grade. Reliability shown through
  alignment, honest numbers, and restraint — not glow, gradients, or ornament.

## Colors

OKLCH throughout. Canonical source: `packages/admin-ui/src/styles/tokens.css`
(landing mirrors the same color values). Semantics are theme-agnostic aliases.

### Light (default)

```css
html[data-theme='light'] {
  --canvas:         oklch(0.986 0.001 255);  /* app background */
  --surface-1:      oklch(1 0 0);            /* cards, panels */
  --surface-2:      oklch(0.973 0.002 255);  /* inputs, raised, hover */
  --surface-sunken: oklch(0.961 0.003 255);  /* wells, code, table head */
  --border:         oklch(0.917 0.003 255);
  --border-strong:  oklch(0.852 0.005 255);
  --ink:            oklch(0.225 0.012 255);  /* body  ≥7:1 on white */
  --text-mid:       oklch(0.470 0.012 255);  /* secondary ≥4.5:1 */
  --text-low:       oklch(0.595 0.010 255);  /* meta, large only ≥3:1 */
  --primary:        oklch(0.550 0.205 264);  /* cobalt — action/active/focus */
  --primary-hover:  oklch(0.490 0.205 264);
  --primary-active: oklch(0.430 0.185 264);
  --primary-soft:   oklch(0.550 0.205 264 / 0.10);
  --on-primary:     oklch(1 0 0);
  --ring:           oklch(0.550 0.210 264 / 0.45);
  --accent-copper:  oklch(0.560 0.130 52);   /* signal only */
  --success: oklch(0.530 0.120 158); --warning: oklch(0.650 0.130 72);
  --danger:  oklch(0.550 0.195 27);  --info:    oklch(0.550 0.120 245);
  /* + *-soft tints and *-ink (darker text-on-soft) variants */
}
```

### Dark (full parity)

```css
html[data-theme='dark'] {
  --canvas:         oklch(0.170 0.006 255);
  --surface-1:      oklch(0.218 0.007 255);
  --surface-2:      oklch(0.262 0.008 255);
  --surface-sunken: oklch(0.150 0.006 255);
  --border:         oklch(0.300 0.008 255);
  --border-strong:  oklch(0.400 0.010 255);
  --ink:            oklch(0.958 0.004 255);
  --text-mid:       oklch(0.715 0.010 255);
  --text-low:       oklch(0.560 0.010 255);
  --primary:        oklch(0.700 0.160 264);  /* brighter to pop on dark */
  --on-primary:     oklch(0.180 0.040 264);  /* near-black-blue on bright fill */
  --accent-copper:  oklch(0.720 0.130 55);
  /* status hues lifted for dark; same semantic names */
}
```

**Rules:** white text on the light cobalt fill; near-black-blue on the bright
dark cobalt fill (Helmholtz-Kohlrausch — saturated mid fills take white text).
Status pills = `*-soft` bg + `*-ink` text + a small icon/shape — never
color-alone. Contrast verified in BOTH themes (ink/canvas ~16:1, text-mid
~6.5:1).

## Typography

```css
--font-sans: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

- Geist + Geist Mono self-hosted via `@fontsource` (no layout-shift), `swap`.
- Sans carries all UI. Mono is **data only** — API keys, client tokens, IDs,
  timestamps, metric values, code/config (tabular-nums). Deliberate line vs. the
  retired mono-everything terminal look.
- Fixed rem scale, ratio ≈1.2 (product). No fluid clamp in console; landing may
  use ONE clamp hero (max ≤ 3.5rem, tracking ≥ -0.02em). `text-wrap: balance` on
  h1–h3; landing prose capped 65–75ch.

## Space, radius, elevation, motion

8px/4px grid (`--space-1:4px … --space-12:96px`). Radii crisp
(`--radius-xs:4px … --radius-lg:12px --radius-pill:999px`). Depth via soft
shadow + hairline, never glow. Semantic z-scale (dropdown→sticky→drawer→
backdrop→modal→toast→tooltip), never arbitrary 999. Motion 120–240ms ease-out
(`cubic-bezier(0.33,1,0.68,1)`), conveys state only — **no page-load
choreography in the console**. `prefers-reduced-motion` alternative for every
animation; reveals enhance an already-visible default (never gate visibility).

## Components

Canonical source: `packages/admin-ui/src/styles/components.css` +
`packages/admin-ui/src/ui/*`. Every interactive element ships **default · hover ·
focus-visible · active · disabled · loading**; focus is always a visible
`--ring`. Vocabulary: Button (primary/secondary/ghost/danger) · Input/Select/
Textarea · DataTable (dense 40px rows, sticky header, sortable headers, optional
checkbox + bulk-action bar, keyboard, responsive fallback) · StatusPill (soft bg
+ ink text + icon) · StatusMenu/ActionMenu (Portal + fixed to escape table
clipping) · SegmentedControl · Dialog/Drawer/ConfirmDialog (focus trap, Esc,
typed-confirm) · Toast · Skeleton · EmptyState (teaches) · KpiCard/MetricsCard
(flat, mono number — NOT the hero-metric template) · Reveal (shared secret
reveal; token variant adds 30s countdown + auto-clear on blur/hidden/timeout).
Flat `--surface-1` cards + hairline border; never nested cards, side-stripe
borders, or glass.

## Layout & CSS architecture

- **Console shell:** top bar (`--nav-h:56px`) + left sidebar (`--sidebar-w:248px`,
  collapsible to 64px icon rail) + content (max-width 1200px). Active nav =
  `--primary-soft` bg tint (not a side-stripe). Mobile bottom nav.
- **Landing:** centered ~1080px sections, one cobalt-accented hero + one copper
  highlight. No SaaS-cream, no gradient blobs, no per-section eyebrows.
- **CSS layering (load order):** `styles/tokens.css` → `styles/base.css` →
  `styles/components.css` → `styles.css` (shrinking legacy residual: shell/util/
  typography) → per-page `styles/pages/<page>.css` (scoped under `.page-<x>`,
  imported by the page component). Vanilla CSS, OKLCH via tokens, no Tailwind/
  CSS-in-JS. See the task `followup-debt.md` for the residual styles.css cleanup.

## Accessibility

WCAG 2.1 AA both themes: body ≥4.5:1, large ≥3:1; visible `--ring` focus on every
interactive element; full keyboard for menus/dialogs/drawers/tables; semantic
landmarks + skip link; state never by color alone; `prefers-reduced-motion`
alternative for every animation.

## Bans (project-specific, on top of the global absolute bans)

Retired Phosphor vocabulary (phosphor/lime glow, scanlines, signal-grid,
terminal-green, mono-everything) AND retired Verdigris teal. Plus the global
bans: gradient text, default glassmorphism, side-stripe borders, hero-metric
template, identical icon-card grids, per-section eyebrows, numbered section
scaffolding, text overflow at any breakpoint.
</content>
