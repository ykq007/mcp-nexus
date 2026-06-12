# PRD — Redesign mcp-nexus UI from scratch

## 1. Summary

Ground-up redesign of the `mcp-nexus` web UI. Retire the "Verdigris" design
system entirely and establish a **new visual identity + design system**, then
rebuild both surfaces on top of it:

- **Admin Console** (`packages/admin-ui`) — authenticated SPA, 6 pages + app
  shell + shared component library. `product` register (design serves the task).
- **Landing page** (`packages/landing-page`) — public marketing surface.
  `brand` register, same design language.

User directive: **maximize user experience and user-friendliness.** Planning
(this PRD + design.md + implement.md) authored with Opus; implementation
delegated to Sonnet sub-agents.

## 2. Users & Context

Developers/operators of a self-hosted multi-provider MCP search gateway (Tavily +
Brave) on Cloudflare Workers + D1. Technically fluent; live in Linear / Stripe /
Vercel / Cloudflare dashboards. Operational mindset: open the console to do one
job (rotate an upstream key, mint/revoke a client token, check usage/quota,
change search strategy), then leave. They value speed, precision, and not being
surprised. Landing's second audience: a developer evaluating adoption.

Brand personality (unchanged): **Precise · engineered · calm** — the register of
Stripe, Linear, Vercel. Only the *visual execution* is replaced, not the
personality.

## 3. Goals

1. A **new, coherent visual identity** shared by console + landing — distinct and
   "this team cares," not a template, and clearly not a third iteration of the
   retired green/teal/terminal looks.
2. **UX-first rebuild** of every flow: lower time-to-task and cognitive load for
   the five core operator jobs (§5), with first-run / empty / loading / error
   states that teach the interface.
3. **Zero functional regression** — every feature, field, action, and state in
   `research/functional-inventory.md` survives unless explicitly cut here.
4. **Accessibility AA** in both light and dark themes from the start.
5. **Both themes first-class** (light + true dark), toggled via `html[data-theme]`.

## 4. In Scope / Out of Scope

**In scope:** new design tokens (color/type/space/radius/elevation/motion, light +
dark); admin console (6 pages + shell + shared component library); landing page
(hero, features, navbar, footer, admin-login flow); i18n preserved (en + zh-CN,
all namespaces).

**Out of scope:** backend/API changes (admin API + data models fixed, consumed
as-is; no new endpoints); net-new product features (redesign, not a feature
release — reorganizing existing capability for clarity is allowed, anything
needing backend work is not); auth/security model changes (token reveal windows,
remember-me, redirect flow behavior preserved).

## 5. Core operator jobs (optimize these)

Judged on how fast and confidently a fluent operator can:

1. **Add / rotate an upstream key** (Tavily/Brave): create, validate, set status,
   sync credits, delete — incl. bulk and import/export.
2. **Mint a client token and wire up a client**: define expiry/scope/rate-limit,
   reveal once, copy the setup snippet for their target.
3. **Check health & usage**: dashboard at a glance + drill into the usage audit
   log with filters and per-event detail.
4. **Test a tool**: playground request/response with history.
5. **Change server strategy / settings**: key-selection strategy, search-source
   mode, research toggle, connection config.

## 6. Functional requirements (must-preserve baseline)

Authoritative list: `research/functional-inventory.md`. Must-preserve highlights:

- **Keys**: Tavily + Brave sections; label, masked key + reveal, Tavily credits
  cell + refresh, status menu (active/disabled/cooldown/invalid), last-used/
  created; search, status filter, sort, multi-select bulk (refresh/delete),
  create with `tvly-` validation, delete confirm (typed "DELETE"), sync-all
  credits, import/export (file + clipboard), `?create=1`, 10/page pagination.
- **Tokens**: prefix+description, status (active/expiring/expired/revoked), scope +
  rate limit, expires/created; search (debounced), status segmented filter;
  create (form → copy) with expiry presets + custom, tool-group restriction, rate
  limit; reveal with 30s countdown + auto-clear (blur/hidden/timeout); setup
  drawer (MCP endpoint + token + per-target config snippets); revoke (soft) +
  delete (hard, typed confirm); `?create=1` / `?setup=1`.
- **Overview**: KPI cards (keys/tokens/usage) linking out, live metrics card,
  recent-usage table, onboarding guide when empty, refresh.
- **Usage**: filters (tool, outcome, token prefix debounced, date range), table,
  row→detail modal (args JSON, error, key id), 20/page pagination.
- **Playground**: token + tool selector + JSON params (sticky), execute, response
  panel + JSON viewer + status/duration, history (localStorage ≤50), load params,
  clear; MCP JSON-RPC session handling.
- **Settings**: API base URL + test connection, auth status + sign in/out,
  language (en/zh-CN), server settings (key strategy, search-source mode with
  cost/availability warnings, research toggle).
- **Shell**: 6-item sidebar (collapsible to icons), top bar (title/subtitle +
  connection summary + theme toggle + sign in/out), mobile bottom nav, skip link.
- **Landing**: navbar, hero, features, footer, admin-login modal (token + remember
  + validate + `?next=` redirect, `?login=1` auto-open), cross-tab token sync.

## 7. Acceptance criteria

1. **No regression**: every item in §6 / the inventory is present and functional;
   a reviewer can complete all five core jobs end-to-end.
2. **New identity**: no Verdigris teal tokens remain; the new system is applied
   consistently across both surfaces (one vocabulary of button/input/table/menu/
   badge/dialog/drawer). No banned patterns (gradient text, default glassmorphism,
   side-stripe borders, hero-metric template, identical icon-card grids,
   per-section eyebrows, numbered scaffolding, terminal-green/glow/scanlines).
3. **A11y AA, both themes**: body ≥4.5:1, large ≥3:1 in light AND dark; visible
   focus ring on every interactive element; full keyboard operation of menus/
   dialogs/drawers/tables; state never by color alone; every animation has a
   `prefers-reduced-motion` alternative. Verified, not assumed.
4. **Responsive**: sidebar collapses, tables degrade gracefully (scroll/stack), no
   text overflow at any breakpoint (incl. landing hero copy).
5. **Quality gates pass**: typecheck, lint, existing tests green (updated where
   markup/selectors intentionally changed); both packages build.
6. **Performance**: no heavy decorative motion in the console; initial paint not
   gated behind a class-triggered reveal; fonts loaded without layout-shift jank.

## 8. Constraints

- Stack fixed: React + react-router (HashRouter), Vite, TypeScript, react-i18next,
  a single coherent icon set; CSS architecture decided in design.md.
- OKLCH for all color. New brand colors chosen in this task.
- Keep the two-package structure and existing build/output wiring
  (`worker/public`, `bridge-server/public`) working.

## 9. Resolved decisions (from clarification)

- **Visual direction:** Direction A — "Graphite & Cobalt" (ink-forward
  monochrome + single cobalt primary + copper signal accent; Geist Sans/Mono;
  light default + true dark). Locked in design.md.
- **No command palette.** The ⌘K command-palette idea is dropped per user;
  navigation stays sidebar + top bar only.
- **Keys IA:** provider switch becomes a top **segmented control (Tavily /
  Brave)** — one provider on screen at a time (halves scroll). Not two stacked
  sections. Accepted trade-off: comparing both providers needs a toggle click.
- **Density bias:** when a screen forces density-vs-breathing-room, default to
  **density / speed for fluent operators** (Linear-grade compactness). Newcomer
  guidance is carried by empty/first-run states, not by loosening every screen.
  Accepted trade-off: slightly steeper for first-time users.
</content>
