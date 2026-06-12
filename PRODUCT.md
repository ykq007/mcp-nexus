# Product

## Register

product

> Primary surface is the authenticated **Admin Console** (design serves the task).
> The public **Landing page** is the brand surface of the same system and shares
> one design language; treat landing work with the `brand` register when focused
> on it, but the system default is `product`.

## Users

Developers and operators running `mcp-nexus` — a self-hosted, multi-provider MCP
search gateway (Tavily + Brave) deployed on Cloudflare Workers + D1. They are
technically fluent and live in tools like Linear, Stripe, Vercel, and Cloudflare
dashboards. Their context is operational: they open the console to do a specific
job — rotate an upstream API key, mint or revoke a client token, check usage and
quota, or change the search strategy — then leave. They value speed, precision,
and not being surprised. The public landing page serves a second audience:
developers evaluating whether to adopt the gateway.

## Product Purpose

`mcp-nexus` gives a single trustworthy control plane over a pool of upstream
search providers: unified MCP tool surface, key rotation and rate limiting,
client-token auth, and usage observability. The Admin Console is where operators
manage all of it. Success looks like an operator completing any management task
without hesitation, trusting the numbers on screen, and never pausing at a
subtly-off control. The landing page's job is to make an evaluating developer
believe this is reliable infrastructure worth running.

## Brand Personality

**Precise · engineered · calm.** Quiet technical confidence — the register of
Stripe, Linear, and Vercel. The interface signals reliability through exactness,
not decoration: tight alignment, honest data, restrained accent. Voice is direct
and unembellished; it explains, it doesn't sell or shout. The tool should
disappear into the task. Where there is delight, it is in craft and precision,
not ornament.

## Anti-references

- **The previous "Phosphor Ops" look** — dark phosphor-terminal / observability
  console with lime-green glow, scanlines, signal-grid motifs, mono-everything.
  Explicitly retired. Avoid cyberpunk-neon, terminal-green, and glow-as-identity.
- **The previous "Verdigris" look** — cool verdigris-teal primary (hue ~190) on
  clean neutral. Explicitly retired in favor of the current **"Graphite & Cobalt"**
  system (ink-forward monochrome + single cobalt primary + copper signal; Geist
  type — see `DESIGN.md`). Avoid teal/green as the brand color; that lane is spent.
- **SaaS-cream landing** — warm near-white body bg, gradient blobs, tiny tracked
  uppercase eyebrows over every section, the hero-metric template.
- **Over-decorated dashboards** — gradient text, glassmorphism cards, side-stripe
  borders, identical icon-heading-text card grids, gratuitous motion.
- **Generic admin-template feel** — the Bootstrap/AntD default that could belong
  to any product. Familiarity is good; anonymity is not.

## Design Principles

1. **Earned familiarity.** Standard affordances done exactly right. The operator
   should trust every control on sight; surprise is a bug, not a feature.
2. **Precision is the brand.** Tight grids, honest numbers, exact alignment, and
   consistent vocabulary do the persuading. Reliability is shown, not claimed.
3. **Restraint with a point of view.** Restrained by default (neutral surfaces,
   one accent that earns its place), but not anonymous — a deliberate, distinct
   identity that reads as "this team cares," not "this is a template."
4. **One system, two registers.** Console and landing speak the same calm,
   engineered language so the product feels continuous from marketing to task.
5. **Clarity scales with density.** Dense data stays legible at a glance;
   hierarchy and rhythm carry the eye, never decoration.

## Accessibility & Inclusion

WCAG 2.1 **AA** baseline across both surfaces: body text ≥4.5:1 and large text
≥3:1 against its background in **both light and dark themes** (light + true dark
mode are first-class from the start), full keyboard navigation with visible focus
rings, semantic landmarks, and a `prefers-reduced-motion` alternative for every
animation. State is never conveyed by color alone (pair with icon/label/shape).
