## ADDED Requirements

### Requirement: Safe redirect-back (`next`) for admin-ui login
The system SHALL accept a `next` query parameter on the admin-ui login route and redirect the user to the intended in-app destination after successful login, using an explicit allow-list to prevent open redirects.

#### Scenario: Unauthenticated access to a protected route
- **GIVEN** the user is signed out
- **WHEN** the user navigates to a protected route (e.g. `/playground`)
- **THEN** the system redirects to `/login?next=%2Fplayground`
- **AND** after login the user is redirected back to `/playground`

### Requirement: Preserve current location when navigating to login
Any UI action that sends the user to the login route (e.g. “Sign in” / “Change token”) SHALL include `next=<current-path>` so that completing login returns the user to the page they were on.

#### Scenario: Signing in from Settings
- **GIVEN** the user is on `/settings` while signed out
- **WHEN** the user clicks “Sign in”
- **THEN** the system navigates to `/login?next=%2Fsettings`
- **AND** after login the user returns to `/settings`

### Requirement: Global sign-out clears stored tokens and redirects to login
The system SHALL provide a global sign-out action. When invoked, it SHALL clear the admin token from both sessionStorage and localStorage and redirect to `/login?next=<current-path>` (or a safe fallback if the path is not allow-listed).

#### Scenario: Signing out from a protected page
- **GIVEN** the user is signed in and is on `/keys`
- **WHEN** the user clicks “Sign out”
- **THEN** the admin token is removed from browser storage
- **AND** the user is redirected to `/login?next=%2Fkeys`

### Requirement: Global 401 handling signs out and redirects to login
When the Admin API responds with 401 Unauthorized, the system SHALL sign the user out and redirect them to `/login?next=<current-path>`, including when the user is currently on a public route.

#### Scenario: Token becomes invalid while on Settings
- **GIVEN** the user is on `/settings`
- **AND** the stored admin token is invalid
- **WHEN** the UI makes an Admin API call and receives a 401 response
- **THEN** the system clears the admin token and navigates to `/login?next=%2Fsettings`

### Requirement: Visiting `/login` while already signed in redirects away
If the user is already signed in and navigates to `/login`, the system SHALL redirect them to the sanitized `next` destination if present, otherwise to `/`.

#### Scenario: Signed-in user opens login URL
- **GIVEN** the user is signed in
- **WHEN** the user navigates to `/login?next=%2Fusage`
- **THEN** the system redirects to `/usage`

### Requirement: Cross-tab sign-out sync (best effort)
When the admin token is persisted (localStorage), the system SHALL implement a best-effort cross-tab sign-out synchronization via storage events so that signing out in one tab signs out other open tabs.

#### Scenario: Signing out in one tab signs out another
- **GIVEN** the user is signed in with “remember me” enabled in Tab A and Tab B
- **WHEN** the user signs out in Tab A
- **THEN** Tab B updates to signed-out state on the next interaction (best effort)
