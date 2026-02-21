## Context
Client tokens authorize access to the MCP endpoint (`/mcp`). Today, tokens are intentionally **non-recoverable** after creation because only a SHA-256 hash is stored. This is secure by default, but operationally brittle: operators frequently need to retrieve a token later (e.g. after closing the “copy token” dialog or rotating machines).

This change introduces an admin-only “reveal token” capability by storing the token encrypted at rest.

## Goals / Non-Goals

### Goals
- Allow an authenticated admin to reveal (retrieve) the full plaintext client token after creation.
- Preserve existing runtime validation (token hash comparison) so `/mcp` auth does not require decrypting stored ciphertext.
- Provide a clear path for legacy tokens created before this change.

### Non-Goals
- Making tokens recoverable for non-admin users/clients.
- Changing token formats or existing authentication rules.
- Recovering tokens created before encrypted storage existed (not possible).

## Decisions

### Decision 1: Store encrypted plaintext token in DB (nullable)
Add a new nullable column (name: `tokenEncrypted`) to client token storage:
- Cloudflare Worker (D1 / SQLite): `ALTER TABLE ClientToken ADD COLUMN tokenEncrypted BLOB;`
- Node server (Prisma / SQLite): `tokenEncrypted Bytes?`

On token creation:
- Generate the token as today.
- Compute/store the existing `tokenHash` for validation.
- Encrypt and store the full token string in `tokenEncrypted` using the existing `KEY_ENCRYPTION_SECRET`.

**Rationale**
- Required for re-reveal capability.
- Keeps `/mcp` validation cheap and constant-time (hash compare) without decrypt on hot path.
- Reuses existing deployment secret (`KEY_ENCRYPTION_SECRET`) already required for API-key encryption.

**Trade-off**
- Increases blast radius: an admin (or an attacker with `ADMIN_API_TOKEN` access) can retrieve client tokens.

### Decision 2: Admin-only reveal endpoint
Add endpoint:
- `GET /admin/api/tokens/:id/reveal`

Behavior:
- Requires admin auth (same as other admin endpoints).
- Returns `{ token: string }` on success.
- Adds `Cache-Control: no-store` to reduce accidental caching.
- If `tokenEncrypted` is missing/null (legacy token), return a clear 409 error instructing rotation/creation of a new token.

### Decision 3: UI reveal flow
Admin UI provides a per-token “Reveal” action that:
- calls the reveal endpoint
- shows the token in a dialog with a copy button and a warning about bearer-token sensitivity

## Risks / Trade-offs
- **Risk: token theft via admin compromise** → Mitigation: keep admin token secret, consider adding optional rate limiting and audit logging of reveal events.
- **Risk: database exfiltration** → Mitigation: tokens are encrypted at rest; however, if attacker also has `KEY_ENCRYPTION_SECRET`, tokens are recoverable (same as API keys).
- **Risk: legacy tokens** → Mitigation: return an actionable error; optionally add a “Rotate token” action later (out of scope for this change).

## Migration Plan
1. Add schema columns (`tokenEncrypted`) via migrations (worker + prisma).
2. Update token creation to populate `tokenEncrypted` for newly created tokens.
3. Implement reveal endpoints (worker + bridge-server).
4. Update Admin UI + docs to reflect new behavior.
5. Rebuild and commit worker Deploy Button static admin assets.

## Open Questions
- Should reveal be disabled by default behind a config flag (e.g. `ENABLE_TOKEN_REVEAL`)? (Not required by current request.)
- Should revoked/expired tokens be revealable? (Default: yes, but can be restricted if desired.)

