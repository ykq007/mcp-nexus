# Implement — mcp-nexus UI redesign

> Execution plan. Opus authored prd.md + design.md; **Sonnet sub-agents
> implement** (dispatched as `trellis-implement`, `model: sonnet`), with
> `trellis-check` gates between phases. Opus stays the integrator/reviewer.

## Development strategy

- **Foundation-first, then fan-out by surface.** The design system + shared
  component library are built and locked before any page is rebuilt, so page
  agents compose against a stable vocabulary (no per-page divergence).
- **CSS split to enable safe parallelism.** Replace the single `styles.css` with
  `src/styles/{tokens,base,components}.css` + `src/styles/pages/<page>.css`.
  Page agents touch only their own page sheet + page component — they don't edit
  shared files concurrently, so parallel page work doesn't conflict.
- **Preserve every feature** in `research/functional-inventory.md`. Behavior,
  data wiring (`src/lib/adminApi.ts`), routes, deep-links (`?create=1`,
  `?setup=1`, `?next=`, `?login=1`), i18n keys (en + zh-CN, all 9 namespaces),
  and tests are contracts. New i18n strings get added to BOTH locales.
- **No backend/API changes.** UI consumes the existing admin API as-is.
- **Verify, don't assume**: contrast (both themes), keyboard paths, responsive,
  reduced-motion — each checked, not declared.

## Strategy block (Trellis)

Review-gate contract: explicit-selection-v1

- **Development mode:** subagent — `trellis-implement` (`model: sonnet`)
  implements; Opus orchestrates/integrates/reviews.
- **Branch vs worktree:** dedicated branch, **no worktree**. Page agents own
  disjoint file sets (per-page `.tsx` + `src/styles/pages/<page>.css`), so
  parallel edits in one working tree don't collide. Escalate to worktree only if
  a real conflict appears.
- **Flow:** default (not TDD). This is a visual/UX rebuild — verification is
  visual + functional-parity + existing tests updated to new markup, not
  test-first. Reference flow: standard `trellis-implement` → `trellis-check`.
- **Pre-development architecture guidance:** 架构审查：disabled (structure is
  already locked by design.md; no guidance pass before start).

Optional review gates status: configured
- **Enabled optional review gates:** trellis-spec-review, trellis-code-review,
  trellis-code-architecture-review, trellis-merge-review
- **Disabled optional review gates:** trellis-improve-codebase-architecture
- **Fixed (non-optional):** trellis-check runs at every phase gate.

> Gate routing: each phase gate = `trellis-check`. `trellis-spec-review` runs per
> phase (feature-parity vs inventory) and at the end. `trellis-code-review` runs
> per phase on the diff. `trellis-code-architecture-review` runs at P1
> (component-library boundaries) and P5. `trellis-merge-review` runs at P5 before
> the final build/test. `trellis-improve-codebase-architecture` deep-review is
> disabled (its prerequisite architecture-review gate is enabled, but deep-review
> was not selected).

## Phase plan (ordered; gates between)

### P0 — Design-system foundation  `[blocking, do first, single agent]`
- Add Geist + Geist Mono (self-host via `geist`/`@fontsource`), preload, swap.
- `src/styles/tokens.css`: all OKLCH tokens (light + dark) + space/radius/
  elevation/motion/z-scale per design.md §1–§3. Wire `html[data-theme]`.
- `src/styles/base.css`: reset, body/type defaults, focus-visible ring, skip
  link, scrollbar, `prefers-reduced-motion` base, landmark defaults.
- Delete/retire Verdigris values; ensure no teal token remains.
- Mirror token values into landing (`packages/landing-page/src/styles/tokens.css`)
  so both surfaces share one palette.
- **Gate:** `trellis-check` — tokens compile, app boots, contrast spot-check both
  themes. No page work starts until this is merged.

### P1 — Shared component library  `[single agent, depends P0]`
Rebuild `src/ui/*` + `src/styles/components.css` to the design.md §4 vocabulary,
keeping each component's public props/behavior so pages keep working:
Button/IconButton, Input/Select/Textarea, DataTable (toolbar + bulk bar + sort +
keyboard + responsive), StatusPill, StatusMenu, ActionMenu (Portal/fixed),
SegmentedControl, Dialog, Drawer, ConfirmDialog (typed-confirm), Toast, Skeleton,
EmptyState, ErrorBanner, KpiCard, MetricsCard, CopyButton, Pagination, Reveal
(shared secret-reveal + token 30s countdown variant), JsonViewer, ToolSelector,
icons (single coherent set).
- **Gate:** `trellis-check` + existing component tests (DataTable, ConfirmDialog,
  CopyButton, MetricsCard, ImportExportActions) pass or are updated for
  intentional markup changes.

### P2 — App shell + navigation + command palette  `[single agent, depends P1]`
Rebuild `src/app/Shell.tsx` + shell CSS per design.md §5: sidebar (collapsible
icon rail), top bar (title/subtitle + theme toggle + sign in/out),
mobile bottom nav, skip link, connection/auth footer. Preserve auth redirect
flow, theme persistence, sidebar-collapse prefs, cross-tab token sync.
- **Gate:** `trellis-check` — shell renders, nav + theme + collapse + a11y
  landmarks + keyboard work.

### P3 — Pages  `[up to 3 parallel Sonnet agents, depends P2; each owns its files]`
Each page: rebuild `src/pages/<Page>.tsx` (+ extracted page components) + its
`src/styles/pages/<page>.css`, to design.md §6, preserving 100% of the inventory
for that page. Add new i18n strings to en + zh-CN. Update that page's tests.
- **P3a** Overview + Settings  (calm KPI row, 3-step first-run; grouped settings)
- **P3b** Keys  (Tavily/Brave segmented; unified table + toolbar + bulk bar;
  create drawer; reveal/credits cells; import/export; typed-DELETE)
- **P3c** Tokens  (guided create drawer: configure → reveal+wire-up; setup
  drawer; 30s reveal; revoke/delete) + Usage (filter bar + detail drawer) +
  Playground (two-pane + history rail)
  > Batch so each agent owns a disjoint file set. Re-balance if one batch is too
  > large (Tokens alone is ~1181 lines — may get its own agent).
- **Gate per batch:** `trellis-check` — feature parity vs inventory, tests,
  build.

### P4 — Landing page  `[single agent, depends P0; can run alongside P3]`
Rebuild `packages/landing-page` (Navbar, Hero, Features, Footer, AdminLoginModal)
to design.md §6 Landing + §5, sharing tokens/type. Preserve login flow
(`?next=`, `?login=1`, remember, cross-tab sync, validate via GET /admin/api/keys).
- **Gate:** `trellis-check` — login flow + responsive + no banned patterns.

### P5 — Integration, audit, hardening  `[Opus-led, depends all]`
- Build wiring intact: `node packages/worker/scripts/syncAdminUiPublic.mjs` +
  `node scripts/syncLandingPagePublic.mjs` produce correct `worker/public` +
  `bridge-server/public` artifacts.
- Full quality gate (see Validation). Cross-surface consistency pass (one
  vocabulary). `impeccable audit` + a11y/contrast verification in BOTH themes
  (chrome-devtools screenshots + lighthouse). Responsive sweep (mobile/tablet/
  desktop), reduced-motion sweep. `knip` deadcode (remove retired Verdigris/old
  components). Fix findings.

## Validation commands

```bash
# typecheck + bundle (vite build runs tsc)
npm --workspace @mcp-nexus/admin-ui run build
npm --workspace @mcp-nexus/landing-page run build
# unit/component tests
npm --workspace @mcp-nexus/admin-ui run test
# full build incl. public-asset sync (final gate)
npm run build
# dead code (retired components/tokens removed)
npm run deadcode:check
# live verify (manual / chrome-devtools): both themes, 5 core jobs, responsive
npm run dev:admin-ui      # and: npm run dev:landing-page
```

## Review gates

Between every phase: a `trellis-check` sub-agent verifies spec compliance +
feature parity + tests/build before the next phase starts. Opus reviews the
report and only advances on green. P3 batches each gate independently.

## Rollback points

- Git branch dedicated to this task; commit per merged phase (P0…P5) so any
  phase can be reverted without losing earlier foundation.
- P0/P1 are the riskiest (everything depends on them) — do not start P2+ until
  their gates are green. If a page batch regresses, revert just that page sheet +
  component (isolated by the CSS split) and re-dispatch.

## Sub-agent dispatch protocol

Every dispatch prompt starts with `Active task: <task.py current path>` then the
phase's file scope + the relevant slices of prd.md / design.md /
`research/functional-inventory.md`. Implementer = `trellis-implement` (Sonnet);
verifier = `trellis-check`. Page agents are told their exact file ownership to
avoid collisions.
```
