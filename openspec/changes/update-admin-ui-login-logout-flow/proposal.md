# Change: Make admin-ui login/logout behave like a standard auth flow (token-based)

## Why
The admin console uses a bearer admin token, but the current login/logout behavior is inconsistent with typical web app expectations:

- Redirect-back (`next`) only whitelists a subset of routes, so users often land on `/` after login instead of returning to their intended destination (e.g. `/playground`).
- “Sign in / change token” actions do not consistently preserve the current location.
- A global 401 (“auth failure”) signs the user out but may not redirect to `/login` when the user is on a public route like `/settings`.
- `/login` does not redirect away when already authenticated.

These issues cause confusion and make “sign in / sign out” feel unreliable.

## What Changes
- Centralize Admin UI route paths in a single module to prevent drift.
- Update `next` sanitization to allow all in-app routes (excluding `/login`) while keeping open-redirect protection.
- Ensure all paths to login include `next=<current-path>` (so login returns users to where they came from).
- Add global “Sign in / Sign out” affordances in the shell header.
- On 401 auth failure, sign out and redirect to `/login?next=<current-path>` (including from public routes).
- If a signed-in user visits `/login`, automatically redirect them to `next` (or `/`).
- Best-effort cross-tab sync for “remember me” sign-out (localStorage).

## Impact
- Affected code:
  - `packages/admin-ui/src/App.tsx`
  - `packages/admin-ui/src/app/Shell.tsx`
  - `packages/admin-ui/src/components/RequireAuth.tsx`
  - `packages/admin-ui/src/lib/sanitizeNext.ts`
  - **New**: `packages/admin-ui/src/app/routePaths.ts` (centralized routes)
  - **New**: `packages/admin-ui/src/app/loginUrl.ts` (shared login URL builder)
  - **New tests** under `packages/admin-ui/src/lib/*` or `packages/admin-ui/src/app/*`
- Backend behavior: no changes (admin token remains `Authorization: Bearer <token>`).

## Non-goals
- No username/password login, user accounts, or server sessions.
- No major CSS redesign beyond small layout/control additions needed for the flow.

