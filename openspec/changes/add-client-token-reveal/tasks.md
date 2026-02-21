## 1. Worker (Cloudflare) storage + API
- [ ] 1.1 Add a D1 migration to persist an encrypted token blob (nullable) on `ClientToken` (e.g. `tokenEncrypted BLOB`).
- [ ] 1.2 Update `packages/worker/src/db/d1.ts`:
  - extend `ClientToken` type to include `tokenEncrypted`
  - select/insert the new column in queries
- [ ] 1.3 Update `packages/worker/src/routes/admin/index.ts`:
  - on token creation, encrypt the full token and store it
  - add `GET /admin/api/tokens/:id/reveal` (admin-auth; `Cache-Control: no-store`)
  - handle legacy tokens where ciphertext is missing (409 with actionable error)
- [ ] 1.4 Add/extend worker tests for reveal behavior.

## 2. Bridge-server (Node) storage + API (parity)
- [ ] 2.1 Add nullable `tokenEncrypted` to Prisma `ClientToken` model and create a migration.
- [ ] 2.2 Update `packages/bridge-server/src/admin/routes.ts`:
  - on token creation, encrypt and store the full token
  - add `GET /admin/api/tokens/:id/reveal` (admin-auth; `Cache-Control: no-store`)
  - handle legacy tokens without ciphertext
- [ ] 2.3 Add/extend bridge-server tests for reveal behavior.

## 3. Admin UI reveal workflow
- [ ] 3.1 Extend `packages/admin-ui/src/lib/adminApi.ts` with `revealToken(id)` API method.
- [ ] 3.2 Update `packages/admin-ui/src/pages/TokensPage.tsx`:
  - add a per-row “Reveal” action
  - show the token in a dialog with copy support
  - adjust “shown once” wording in help/toasts
- [ ] 3.3 Update i18n locale strings (at least `en` + `zh-CN`) that mention “shown once”.
- [ ] 3.4 Rebuild and commit Deploy Button admin assets:
  - run `npm --workspace @mcp-nexus/worker run build:admin` and commit updated `packages/worker/public/admin/*`
- [ ] 3.5 Add/extend admin-ui tests for the reveal flow and error handling.

## 4. Docs + validation
- [ ] 4.1 Update docs that describe token “shown once” behavior (e.g. `packages/worker/README.md`).
- [ ] 4.2 Run: `npm run typecheck`, admin-ui tests, worker tests, bridge-server tests, and `npm --workspace @mcp-nexus/worker run verify:deploy-button`.
- [ ] 4.3 Run `openspec validate add-client-token-reveal --strict`.

## Manual QA checklist
- [ ] Create token → reveal immediately works.
- [ ] Close dialog → reveal the same token later from the token list works.
- [ ] Legacy token (ciphertext missing) → reveal shows a clear error + suggested remediation.

