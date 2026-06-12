# Tokens Page UX Redesign — Implementation Plan

> Planner: Fable. Implementers: Sonnet. Verifiers: Opus.
> Scope: `/admin/#/tokens` (packages/admin-ui) — flow + UI redesign within the existing
> **Verdigris** design system (see DESIGN.md output of `node .claude/skills/impeccable/scripts/context.mjs`,
> and `packages/admin-ui/src/styles.css`). No new colors, no new fonts, no backend changes.

## Context

- Page: `packages/admin-ui/src/pages/TokensPage.tsx` (current implementation, 545 lines).
- Shared UI: `packages/admin-ui/src/ui/` — `DataTable`, `Dialog`, `Drawer`, `ConfirmDialog`,
  `CopyButton`, `Pagination`, `EmptyState`, `ErrorBanner`, `toast`, `icons`, `StatusMenu`.
- CSS vocabulary already in `styles.css`: `.badge[data-variant=success|warning|danger|neutral]`,
  `.btn` + `data-variant` + `.btn--sm/--xs/--icon`, `.card/.cardHeader/.cardBody`, `.input`,
  `.actionMenuItem`, `.bulkActionsBar`, surface/border/text tokens. **Reuse these; extend only
  when no equivalent exists.**
- API (`packages/admin-ui/src/lib/adminApi.ts`): `listTokens`, `createToken({description?,
  expiresInSeconds?, allowedTools?, rateLimit?})`, `revealToken(id)`, `revokeToken(id)`,
  `deleteToken(id)`. DTO: `{id, tokenPrefix, description, allowedTools, rateLimit, revokedAt,
  expiresAt, createdAt}`.
- i18n: `src/i18n/locales/{en,zh-CN}/tokens.json` (+ `common.json` for shared verbs).
  **Every new string must land in both locales.**

## Current UX problems (the why)

1. **Expiry asked in raw seconds** ("e.g. 86400") — operator does arithmetic for the machine.
2. **Post-create flow is disjoint**: token appears in a cramped dialog; client setup lives in a
   separate drawer the user must discover. Mint → configure should be one continuous flow.
3. **Table hides the facts that matter**: `revokedAt` (status!), `allowedTools`, `rateLimit`
   are in the DTO but never shown. An operator cannot audit tokens at a glance.
4. **No Revoke** in the UI although `revokeToken` exists — only destructive Delete.
5. **Absolute-only timestamps** — "2026-05-02 14:00" instead of "in 3 days".
6. **No search/filter** — only pagination.
7. **Reveal dialog auto-hides after 30s silently** — no visible countdown affordance.
8. **Setup drawer requires manually pasting a token.**
9. `dangerouslySetInnerHTML` used for setup help text (replace with safe rendering).
10. Inline `style={{padding…}}` on action buttons instead of `.btn--sm` classes.

## Redesigned flows

### Flow 1 — Mint a token (Create dialog becomes a 2-step flow)

**Step 1: form** (replaces current form):
- **Description** (unchanged).
- **Expires**: segmented preset control (radiogroup semantics, keyboard navigable):
  `Never · 1 hour · 24 hours · 7 days · 30 days · 90 days · Custom`. Default **Never**
  (matches current behavior — no surprise). Custom reveals a number input + unit select
  (hours/days). Below the control, a live mono preview of the absolute expiry datetime
  ("Expires 2026-07-12 14:32" / "Never expires"). Maps to `expiresInSeconds`.
- **Tool access**: choice "All tools" (default) vs "Restrict to selected" — when restricted,
  show the checklist **grouped by provider** (Tavily: tavily_search/extract/crawl/map/research;
  Brave: brave_web_search/brave_local_search) with a select-all toggle per group and a count
  ("5 of 7 selected"). Validation: restricted with 0 selected disables submit with inline hint.
- **Rate limit**: toggle + rpm number input (unchanged behavior, placeholder 60).
- Submit stays disabled while creating; button shows inline spinner (existing pattern).

**Step 2: token issued** (same Dialog, content swaps — not a second modal):
- Title "Token created". Full token in a mono read-only well (`--surface-sunken` style block,
  not a tiny input) + CopyButton.
- Copy explains re-reveal is possible (existing copy in `copyDialog.warning` — keep meaning).
- Footer: **"Set up a client"** (primary → closes dialog, opens Setup drawer with token
  prefilled — the existing `setSetupClientToken` seam) and **"Done"** (ghost).
- Closing via Esc/overlay = "Done". No way to lose the token accidentally before copy:
  closing without having copied asks nothing (re-reveal exists) — keep friction low.

### Flow 2 — Audit tokens (the table)

Columns (desktop):
1. **Token** — `tokenPrefix` in mono, description underneath in `--text-mid` (single cell,
   two lines; "—" handling stays for missing description).
2. **Status** — pill via `.badge`: `Active` (success), `Expires soon` (warning, < 72h left),
   `Expired` (neutral), `Revoked` (danger). Derived: `revokedAt` → Revoked; `expiresAt` in
   past → Expired; else Active/Expires-soon. Icon + label, never color alone.
3. **Scope** — "All tools" or "N tools" (title attr lists them), mono count; plus rate limit
   "60 rpm" in mono when set, "—" otherwise. (One "Scope" column with two stacked compact
   lines, or two narrow columns — implementer picks what stays clean at 1280px.)
4. **Expires** — relative ("in 3 days", "never", "expired 2 d ago") with absolute datetime in
   `title`. Mono.
5. **Created** — relative with absolute in `title`. Mono.
6. **Actions** — right-aligned: `Reveal` ghost `.btn--sm` button + overflow "⋯" menu
   (reuse the existing action-menu pattern from KeysPage/`StatusMenu`) containing:
   **Configure client** (reveals via API then opens Setup drawer prefilled),
   **Revoke** (only for active tokens), **Delete** (danger).

Header bar: title + count summary (existing), plus a **filter row** under the header:
- Search input (filters client-side on prefix + description, debounced via existing
  `useDebounce`).
- Status filter as segmented control: `All · Active · Expired · Revoked`.
- Filters compose with pagination (reset to page 1 on filter change). Empty-filter-result
  state distinct from no-tokens empty state ("No tokens match — clear filters" action).

Revoked rows: muted text (`--text-low`) except the pill, no Revoke action.

### Flow 3 — Recover / configure an existing client

- **Reveal dialog**: keep 30s auto-hide + blur/visibility clearing, but make it visible —
  a thin progress bar (or "Hides in 24s" mono caption, aria-live="polite" updated sparingly,
  e.g. every 5s) under the token well. Animation respects `prefers-reduced-motion` (caption
  only). Add a "Use in setup" secondary button → closes dialog, opens drawer prefilled.
- **Setup drawer**: keep structure; replace `dangerouslySetInnerHTML` with safe JSX
  (split the help string into i18n parts or use `<Trans>` with `components`). Snippet target
  picker stays buttons but with `aria-pressed` (already) — ensure they read as tabs/segments
  visually (one consistent segmented style shared with the expiry presets and status filter).
  Code snippet: render in a `<pre>`-style mono block with the CopyButton adjacent (current
  textarea is acceptable; `readOnly` + auto-height logic stays if kept).

### Flow 4 — Decommission

- **Revoke**: `ConfirmDialog` without typed confirmation (reversible-ish, audit-preserving):
  explains the token stops working immediately but stays listed. Success toast.
- **Delete**: existing typed-DELETE `ConfirmDialog` stays (permanent).

## Implementation notes

- New small pieces (put in `src/ui/` or `src/app/` following existing naming):
  - `SegmentedControl` (used 3×: expiry presets, status filter, possibly snippet targets).
    Radiogroup keyboard semantics, focus-visible ring, `.btn`-derived or new `.segmented`
    CSS in `styles.css` consistent with Verdigris (crisp radii, hairline borders).
  - `tokenStatus.ts` pure helpers: `deriveTokenStatus(tok, now): 'active'|'expiring'|'expired'|'revoked'`
    and `presetToSeconds`/custom-duration mapping. **Unit-test these** (vitest, colocated
    `*.test.ts` like existing tests).
  - Relative time: extend `src/lib/format.ts` if a helper is missing (check first —
    `formatRelativeSeconds` exists).
- Keep `useSearchParams` deep-links working: `?create=1` opens create dialog, `?setup=1`
  opens drawer (existing behavior, don't regress).
- All states per component: default/hover/focus-visible/active/disabled/loading.
- i18n: en + zh-CN parity, no hardcoded UI strings. zh-CN translations must be real
  translations, not English copies.
- No bans: no side-stripe borders, no gradient text, no glass, no glow. Mono only for data.
- Tests + build must pass: `npm --workspace @mcp-nexus/admin-ui run test` and
  `npm --workspace @mcp-nexus/admin-ui run build`.
- Do NOT hand-edit `packages/worker/public/**` — it is synced by
  `node packages/worker/scripts/syncAdminUiPublic.mjs` after a build.

## Out of scope

- Backend/API changes (revoke endpoint already exists).
- Other console pages (Overview/Keys/Usage/Settings/Playground) — verify-phase may report
  consistency findings but only the Tokens flow is rebuilt.
- Landing page.
