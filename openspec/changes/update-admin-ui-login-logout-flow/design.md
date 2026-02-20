## Context
Admin UI authentication is token-based: the user pastes an admin token that must match the server `ADMIN_API_TOKEN`. The UI stores the token in sessionStorage (default) or localStorage (“remember me”).

Routing uses `HashRouter` with `base: '/admin/'` (Vite). Redirects are implemented via React Router navigation to `/login?next=...`.

## Goals
- Preserve user intent during login redirects (including for all protected routes).
- Ensure consistent redirect to `/login` on sign-out and on 401 auth failures.
- Keep open-redirect protections.
- Reduce duplication of “route lists” across `App.tsx`, `Shell.tsx`, and `sanitizeNext.ts`.

## Key decisions

### 1) Centralize route paths
Create `src/app/routePaths.ts` to hold the canonical set of in-app paths. This prevents drift between:
- `App.tsx` route definitions
- `Shell.tsx` nav item paths
- `sanitizeNext.ts` allow-list

### 2) Continue using an allow-list for `next`
Rather than allowing arbitrary internal paths, we keep an explicit allow-list derived from centralized routes:
- Prevents open redirect vulnerabilities
- Avoids accidentally enabling redirects to unhandled/legacy paths
- Makes behavior predictable and testable

### 3) Shared login URL builder
Introduce `buildLoginUrl(next)` to ensure all login navigations:
- include a sanitized `next`
- encode properly
- share consistent behavior across guards and UI actions

### 4) Global auth failure redirect
On 401, we:
1) clear token, then
2) navigate to login with `next=<current-path>`.

This fixes the “signed out but still on Settings” confusion when auth failures occur on public pages.

