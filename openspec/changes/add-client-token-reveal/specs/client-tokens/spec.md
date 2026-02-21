## ADDED Requirements

### Requirement: Admin token reveal after creation
The system SHALL allow an authenticated admin to reveal the full plaintext value of a client token after it has been created.

#### Scenario: Reveal succeeds for a revealable token
- **WHEN** an authenticated admin requests `GET /admin/api/tokens/:id/reveal` for a token with encrypted token storage
- **THEN** the system returns `200` with `{ "token": "<full token>" }`
- **AND** the response MUST include `Cache-Control: no-store`

#### Scenario: Reveal fails for legacy token without ciphertext
- **WHEN** an authenticated admin requests token reveal for a token created before encrypted token storage existed
- **THEN** the system returns a non-2xx error with an actionable message instructing the admin to rotate/create a new token

### Requirement: Encrypted token storage at rest
The system SHALL persist client tokens encrypted at rest to support admin reveal without changing runtime token validation.

#### Scenario: Runtime validation remains hash-based
- **WHEN** a client calls `/mcp` with `Authorization: Bearer <client_token>`
- **THEN** the system validates the token by comparing a derived hash to the stored `tokenHash`
- **AND** the system does not need to decrypt the stored encrypted token on the `/mcp` request path

### Requirement: Admin UI reveal workflow
The admin UI SHALL provide a way to reveal and copy an existing client token from the token list.

#### Scenario: Admin reveals token from the token list
- **WHEN** an admin clicks “Reveal” for a token row in the Admin UI
- **THEN** the UI calls the token reveal endpoint and displays the token in a dialog suitable for copying

