# Change: Add admin-only client token reveal after creation

## Why
Client tokens are currently shown once at creation time and never retrievable afterward. If an admin misses the copy window, the only recovery path is creating a new token and rotating every dependent MCP client, which causes avoidable operational churn and downtime.

## What Changes
- Add recoverable encrypted token storage for newly created client tokens in both runtime data paths:
  - Cloudflare Worker D1 schema + migration (`packages/worker/migrations/*`, `packages/worker/src/db/d1.ts`)
  - Prisma schema + migration for Node bridge (`packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/*`)
- Add a new admin-only reveal endpoint for client tokens:
  - `GET /admin/api/tokens/:id/reveal`
  - Implemented in both worker and bridge-server admin routes.
- Keep existing token-hash authentication behavior unchanged (`tokenHash` verification remains the source of truth for request auth).
- Add admin-ui token management updates to support a `Reveal` action with secure UX defaults (ephemeral display + copy affordance).
- Add security controls and observability around reveal operations (rate limit, audit logging, no-store response policy, error semantics for non-recoverable legacy tokens).

## Impact
- Affected specs:
  - `admin-client-token-reveal` (new capability)
- Affected code (planned):
  - Worker backend/data:
    - `packages/worker/src/routes/admin/index.ts`
    - `packages/worker/src/db/d1.ts`
    - `packages/worker/src/crypto/crypto.ts`
    - `packages/worker/migrations/*`
  - Prisma/bridge backend:
    - `packages/db/prisma/schema.prisma`
    - `packages/db/prisma/migrations/*`
    - `packages/bridge-server/src/admin/routes.ts`
    - `packages/bridge-server/src/auth/clientToken.ts`
  - Admin UI:
    - `packages/admin-ui/src/lib/adminApi.ts`
    - `packages/admin-ui/src/pages/TokensPage.tsx`
    - `packages/admin-ui/src/app/*Reveal*.tsx` (or shared reveal cell abstraction)
    - `packages/admin-ui/src/i18n/locales/*/tokens.json`
- Security trade-off summary:
  - Benefit: lower operational risk from lost tokens and fewer emergency token rotations.
  - Cost: encrypted-at-rest token material introduces additional secret-at-rest exposure if encryption/admin credentials are compromised.
  - Mitigation direction: strict admin auth, reveal rate limits, audit trails, no-store responses, short-lived UI reveal states, and explicit legacy-token non-recoverable handling.

## Non-goals
- No change to client token authentication format or hash verification semantics.
- No automatic backfill of existing tokens that were created before encrypted token storage exists.
- No expansion of reveal access beyond current admin-token authorization.
