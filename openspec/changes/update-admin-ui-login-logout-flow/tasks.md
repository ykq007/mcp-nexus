## 1. Spec-aligned route + redirect safety
- [x] 1.1 Add centralized route path constants for admin-ui (include `/`, `/keys`, `/tokens`, `/usage`, `/playground`, `/settings`, `/login`).
- [x] 1.2 Update `sanitizeNext` to derive its allow-list from centralized routes (exclude `/login`) and add tests (allow all app routes, reject open redirects).
- [x] 1.3 Add a shared helper to build the login URL (`/login?next=…`) and refactor `RequireAuth` to use it.

## 2. Login/logout navigation behavior
- [x] 2.1 Ensure “go to login” actions preserve the current location (include `next`).
- [x] 2.2 Add global “Sign in / Sign out” affordances in the shell header.
- [x] 2.3 Redirect signed-in users away from `/login` (to `next` or `/`).

## 3. Global 401 handling
- [x] 3.1 On 401 auth failure, sign out and navigate to `/login?next=<current-path>` (works even from public routes like `/settings`).

## 4. Cross-tab behavior (best effort)
- [x] 4.1 Add a `storage` listener so “remember me” sign-out in one tab signs out other tabs.

## 5. QA + validation
- [x] 5.1 Run admin-ui tests (`npm --workspace @mcp-nexus/admin-ui test`) and fix regressions.
- [x] 5.2 Run typecheck/build (`npm run typecheck`, `npm run build`).
- [x] 5.3 Run `openspec validate update-admin-ui-login-logout-flow --strict`.

## Manual QA checklist
- [ ] Navigate directly to `/#/playground` while signed out → redirected to `/#/login?next=%2Fplayground` → sign in → returned to `/#/playground`.
- [ ] Click “Sign in” from Settings while signed out → returned to Settings after login.
- [ ] Click “Sign out” from any protected route → redirected to login with `next` set to the page you were on.
- [ ] Trigger a 401 (wrong token) while on Settings → signed out and redirected to login.
