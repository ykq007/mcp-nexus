# Design

> Visual system for `mcp-nexus` — Admin Console (product) + Landing (brand).
> Direction: **"Verdigris"** — a precision instrument at rest. Lab-grade control
> surface, cool teal readout on clean neutral, the quiet confidence of a tool
> that just works. Restrained, exact, engineered. Replaces the retired
> "Phosphor Ops" terminal look (see `PRODUCT.md` anti-references).

## Theme

- **Strategy:** Restrained (product floor) — neutral surfaces, one teal primary
  that earns its place, a single copper signal accent. The mood lives in the
  brand color + typography, never in a tinted background.
- **Light + true dark mode, both first-class.** Toggle via `html[data-theme]`.
  Light is the default canvas; dark has full parity. WCAG AA in both.
- **Mood:** calm, precise, infrastructure-grade. Reliability shown through
  alignment, honest numbers, and restraint — not glow, gradients, or ornament.

## Colors

OKLCH throughout. Two complete ramps; semantics are theme-agnostic aliases.

### Light (default)

```css
html[data-theme='light'] {
  color-scheme: light;
  /* Surfaces — pure-neutral cool, near-white canvas + white cards */
  --canvas:        oklch(0.984 0.003 225); /* app background */
  --surface-1:     oklch(1 0 0);           /* cards, panels (pure white) */
  --surface-2:     oklch(0.968 0.004 225); /* raised / hover / inputs */
  --surface-sunken:oklch(0.955 0.004 225); /* wells, code blocks */

  --border:        oklch(0.916 0.004 225);
  --border-strong: oklch(0.858 0.006 230);

  --ink:           oklch(0.24 0.015 235);  /* body text  ≥7:1 on white */
  --text-mid:      oklch(0.49 0.012 235);  /* secondary  ≥4.5:1 */
  --text-low:      oklch(0.60 0.010 235);  /* faint, large/meta only ≥3:1 */

  /* Brand */
  --primary:       oklch(0.56 0.120 192);  /* verdigris teal */
  --primary-hover: oklch(0.50 0.120 192);
  --primary-active:oklch(0.45 0.110 192);
  --primary-soft:  oklch(0.56 0.120 192 / 0.10); /* selected/tint bg */
  --on-primary:    oklch(1 0 0);           /* white text on teal fill */
  --ring:          oklch(0.56 0.130 192 / 0.45);

  --accent:        oklch(0.62 0.130 50);   /* copper — signal only */
  --accent-soft:   oklch(0.62 0.130 50 / 0.12);
  --on-accent:     oklch(1 0 0);

  /* Semantic status (distinct hues; never color-alone) */
  --success:       oklch(0.56 0.130 155); --success-soft: oklch(0.56 0.130 155 / 0.12);
  --warning:       oklch(0.70 0.140 75);  --warning-soft: oklch(0.70 0.140 75 / 0.14);
  --danger:        oklch(0.55 0.200 27);  --danger-soft:  oklch(0.55 0.200 27 / 0.12);
  --info:          oklch(0.56 0.120 245); --info-soft:    oklch(0.56 0.120 245 / 0.12);
}
```

### Dark (full parity)

```css
html[data-theme='dark'] {
  color-scheme: dark;
  --canvas:        oklch(0.178 0.008 240);
  --surface-1:     oklch(0.215 0.009 240);
  --surface-2:     oklch(0.255 0.010 240);
  --surface-sunken:oklch(0.150 0.008 240);

  --border:        oklch(0.300 0.010 240);
  --border-strong: oklch(0.400 0.012 240);

  --ink:           oklch(0.950 0.006 230);
  --text-mid:      oklch(0.720 0.010 235);
  --text-low:      oklch(0.560 0.010 240);

  --primary:       oklch(0.74 0.130 190);  /* brighter in dark for pop */
  --primary-hover: oklch(0.80 0.130 190);
  --primary-active:oklch(0.68 0.120 190);
  --primary-soft:  oklch(0.74 0.130 190 / 0.14);
  --on-primary:    oklch(0.17 0.030 195);  /* near-black teal on bright teal */
  --ring:          oklch(0.74 0.130 190 / 0.50);

  --accent:        oklch(0.74 0.130 55);
  --accent-soft:   oklch(0.74 0.130 55 / 0.16);
  --on-accent:     oklch(0.18 0.030 55);

  --success:       oklch(0.72 0.140 155); --success-soft: oklch(0.72 0.140 155 / 0.16);
  --warning:       oklch(0.78 0.140 75);  --warning-soft: oklch(0.78 0.140 75 / 0.16);
  --danger:        oklch(0.66 0.190 27);  --danger-soft:  oklch(0.66 0.190 27 / 0.18);
  --info:          oklch(0.72 0.120 245); --info-soft:    oklch(0.72 0.120 245 / 0.16);
}
```

**Rules:** white text on the light-mode teal fill; near-black on the bright
dark-mode teal fill. Accent (copper) is reserved for signal (attention, credit
warnings, a single landing highlight) — never decoration. Status colors always
pair with an icon/label/shape, never color alone.

## Typography

One engineered family for everything UI; mono **only** for real data.

```css
--font-sans: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

- **Sans** carries headings, labels, buttons, body. IBM Plex reads "engineered"
  honestly and is not the Inter default.
- **Mono** is for tabular numerals, API keys, client tokens, IDs, timestamps,
  metric values, and code/config snippets — anything the operator reads as data.
  This is the deliberate line vs. the old mono-everything terminal look.
- Fixed rem scale, ratio ≈1.2 (product). No fluid clamp in console UI; the
  landing may use one large clamp hero (max ≤ 4rem, tracking ≥ -0.02em).

```css
--text-2xs: .6875rem; --text-xs: .75rem;  --text-sm: .8125rem;
--text-base:.875rem;  --text-md: .9375rem; --text-lg: 1.0625rem;
--text-xl: 1.25rem;   --text-2xl:1.5rem;   --text-3xl:1.875rem; --text-4xl:2.5rem;
--fw-normal:400; --fw-medium:500; --fw-semibold:600; --fw-bold:700;
--lh-tight:1.2; --lh-base:1.55; --lh-loose:1.7;
```

Landing prose capped 65–75ch; `text-wrap: balance` on h1–h3.

## Spacing, Radii, Elevation

```css
/* 8px / 4px grid */
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px;
--space-6:32px; --space-7:40px; --space-8:48px; --space-10:64px; --space-12:96px;

/* Crisp, not pillowy */
--radius-xs:3px; --radius-sm:5px; --radius:7px; --radius-lg:10px; --radius-pill:999px;

/* Depth via soft shadow + hairline, never glow */
--shadow-sm: 0 1px 2px oklch(0.2 0.02 240 / .06);
--shadow:    0 2px 8px oklch(0.2 0.02 240 / .08), 0 0 0 1px var(--border);
--shadow-lg: 0 12px 32px oklch(0.2 0.02 240 / .12), 0 0 0 1px var(--border);
```

## Components

Every interactive element ships **default · hover · focus-visible · active ·
disabled · loading**. Focus is always a visible `--ring`.

- **Buttons:** primary (teal fill), secondary (surface + border), ghost,
  danger. One shape, one height scale across the whole app.
- **Inputs/selects:** `--surface-2` fill, `--border`, teal focus ring. Identical
  vocabulary everywhere.
- **Data table:** dense rows, mono tabular numerals, sticky header, row hover,
  zebra optional. The console's primary surface — tune it hardest.
- **Status pills:** semantic-soft bg + solid text + small icon. Never color-only.
- **KPI / metric:** number in mono, label in sans `--text-mid`. NOT the
  gradient hero-metric template — flat, honest, aligned to a grid.
- **Cards/panels:** flat `--surface-1` + hairline border. Never nested cards,
  never side-stripe borders, never glass.
- **Loading:** skeletons for content, inline spinners only for button actions.
- **Empty states:** teach the interface (what it is + the primary action), not
  "nothing here."

## Layout

- **Console:** app shell — top bar (`--nav-h:56px`) + left sidebar
  (`--sidebar-w:248px`, collapsible to icons) + content. Responsive is
  structural: sidebar collapses, tables go horizontally scrollable / stacked.
- **Landing:** centered max-width (~1080px) sections, generous vertical rhythm,
  one teal-accented hero. No per-section uppercase eyebrows, no 01/02/03 markers.

## Motion

- 150–250 ms, ease-out (`cubic-bezier(0.33,1,0.68,1)`). Conveys state only:
  hover, focus, selection, reveal, toast. No page-load choreography in the
  console. Landing may stagger one section's reveal, enhancing an already-visible
  default.
- `@media (prefers-reduced-motion: reduce)` → crossfade/instant for every
  animation.

## Bans (project-specific, on top of the global absolute bans)

Anything from the retired Phosphor Ops vocabulary: phosphor/lime glow, scanlines,
signal-grid backdrops, mono-everything UI, terminal-green. Plus the global bans:
gradient text, glassmorphism, side-stripe borders, hero-metric template, identical
card grids, per-section eyebrows, numbered section scaffolding.
