## ADDED Requirements

### Requirement: Recoverable encrypted storage for newly created client tokens
The system SHALL persist recoverable encrypted token material for newly created client tokens, in addition to existing token verification hash fields, across both Worker D1 and Prisma-backed storage paths.

#### Scenario: Creating a new token stores both auth and reveal data
- **WHEN** an admin creates a new client token
- **THEN** the system stores token verification data used by client auth (including hash/prefix fields)
- **AND** the system stores encrypted token material that can be decrypted only by authorized admin reveal logic

#### Scenario: Legacy token without encrypted material remains non-recoverable
- **GIVEN** a token record created before encrypted reveal storage was introduced
- **WHEN** an admin requests reveal for that token
- **THEN** the system returns a documented non-recoverable error response
- **AND** the system does not fabricate or return any plaintext token value

### Requirement: Admin-only token reveal endpoint
The system SHALL provide an admin-authenticated endpoint at `GET /admin/api/tokens/:id/reveal` that returns the full token plaintext only for eligible recoverable token records.

#### Scenario: Reveal succeeds for an eligible token
- **GIVEN** a valid admin token and a recoverable client token record
- **WHEN** the admin calls `GET /admin/api/tokens/:id/reveal`
- **THEN** the system returns `200` with the full client token value

#### Scenario: Reveal fails for missing token id
- **WHEN** the admin calls `GET /admin/api/tokens/:id/reveal` with an unknown token id
- **THEN** the system returns `404`
- **AND** no sensitive token value is returned

### Requirement: Reveal operations are security-controlled and auditable
The system SHALL enforce security controls on token reveal operations, including admin authorization, rate limiting, no-store response policy, and audit logging of reveal outcomes.

#### Scenario: Reveal response is non-cacheable
- **WHEN** a token reveal response is returned
- **THEN** the response includes `Cache-Control: no-store`

#### Scenario: Reveal attempts are audited
- **WHEN** a reveal attempt completes (success or failure)
- **THEN** the system records an audit event with outcome and token resource identifier

#### Scenario: Reveal is throttled when limits are exceeded
- **WHEN** reveal requests exceed configured policy limits within the active window
- **THEN** the system rejects additional requests with a rate-limit response

### Requirement: Admin UI supports controlled token reveal
The admin token management UI SHALL provide a Reveal action that can fetch and temporarily display recoverable token plaintext, with explicit secure-display behavior.

#### Scenario: Admin reveals and copies a token from the tokens list
- **GIVEN** a recoverable token row in the tokens table
- **WHEN** the admin activates Reveal
- **THEN** the UI requests the reveal endpoint and displays the plaintext token
- **AND** the UI provides a copy action while token text is visible

#### Scenario: Revealed token is hidden automatically
- **WHEN** a token has been revealed in the UI
- **THEN** the UI auto-hides it after a short timeout
- **AND** the UI hides it when the page loses focus or becomes hidden

### Requirement: Reveal capability preserves existing client auth behavior
Adding reveal capability SHALL NOT change how client requests are authenticated or how token lifecycle states are enforced.

#### Scenario: Existing auth checks remain authoritative
- **WHEN** a client request is authenticated
- **THEN** the system still validates token hash/prefix and lifecycle constraints (revoked/expired)
- **AND** reveal storage presence does not bypass or weaken auth checks
