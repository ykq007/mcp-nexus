# Follow-up debt — redesign-ui-from-scratch

Non-blocking architecture debt surfaced by the P5 architecture-review gate.
The redesign passed all gates; these are cleanup items for a future pass, NOT
regressions. Recorded so they aren't lost.

## Fixed in P5 (already done)
- Removed the duplicate `.actionMenuItem[data-focused]` rule in `styles.css`
  that shadowed the canonical `components.css` rule via cascade (divergence trap).
- Removed unused `--glow-accent` / `--glow-danger` tokens from `tokens.css`.
- Removed retired `OnboardingGuide.tsx` + its CSS + the now-unused
  `@heroicons/react` dependency.

## Open debt (follow-up)
1. **Finish emptying `styles.css`.** Still carries: `.usagePage` /
   `.usagePageCard` / `.usageTableScroller` (belong in `pages/usage.css` scoped
   under `.page-usage`); a dead `.tabs` / `.tab` / `.tabBadge` block (Keys now
   uses `SegmentedControl` — confirmed no page references them); `.json-viewer`
   syntax-color rules duplicated/overridden by `pages/playground.css`. When
   `styles.css` reaches zero page/component rules, delete it + its `main.tsx`
   import.
2. **Prune `tokens.css` backward-compat aliases (~55% of the file).** After (1),
   `grep` for remaining consumers of `--bg`, `--text-hi`, `--amber`, `--cyan`,
   `--t-fast/base/slow`, `--panel`, `--muted`, `--surface-hover`, `--border-subtle`,
   `--color-*` and delete any with no consumers. Target ~170 lines of real tokens.
3. **Standardize page-CSS scoping.** Five pages use the descendant pattern
   (`.page-overview .overview-*`); `TokensPage` uses flat BEM (`.page-tokens__*`).
   Convert Tokens to the descendant pattern and add a one-line convention comment
   to each page sheet. (No collision risk today — prefixes are distinct.)
4. **TokensPage prop-drilling.** `TokenCreateStep1/2` receive `t`/`tc` as props;
   `KeysPage` sub-components call `useTranslation` directly. Standardize on the
   hook-in-component pattern.
5. **Two `tokens.css` files (admin-ui 4px grid, landing 8px grid)** share color
   values but are separate documents. Add a comment in both noting the
   intentional spacing divergence and that colors must be kept in sync manually
   (or extract a shared color-token source).
6. **`packages/admin-ui/src/.workflow/`** scaffolding sits inside `src/`
   (gitignored, not bundled) — relocate out of `src/` for hygiene.
7. **Minor:** `formatRelativeSeconds` (format.ts) + 4 exported types
   (`ActionMenuOption`, `KeyRevealProps`, `TokenRevealProps`, `SegmentedOption`)
   are flagged unused by knip — keep as API surface or drop the `export`.
8. **AdminLoginModal**: backdrop-click during an in-flight submit doesn't abort
   the fetch (pre-existing) — add an AbortController/mounted guard.
</content>
