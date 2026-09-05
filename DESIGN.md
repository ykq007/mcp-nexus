# mcp-nexus UI Design System

## Direction: Network Control Ledger

mcp-nexus should feel like infrastructure control software: precise, quiet, fast to scan, and built around operational state rather than decoration.

The interface borrows the discipline of router tables, network status boards, command workbenches, and high-end developer tools. The core visual unit is a **register**: ruled rows, aligned fields, clear states, and broad working surfaces.

## Product posture

- Audience: technically fluent developers and operators.
- Primary job: inspect state, change configuration, act, leave.
- Density: compact but calm; never cramped.
- Copy: short, operational, literal.
- Visual hierarchy comes from alignment, rules, whitespace, and type weight — not stacks of cards.
- Light and dark themes are both first-class.

## Color

### Light

- Canvas: cool near-white.
- Primary surface: almost white.
- Ink: near-black graphite.
- Secondary text: neutral cool gray.
- Rules: neutral gray hairlines.
- Action / active: electric blue.
- Warning / quota pressure: amber only.
- Error / destructive: red only.
- Success: restrained green only when state meaning requires it.

### Dark

- True dark graphite canvas, not blue-black neon.
- Surfaces separate by luminance and borders, not glows.
- Electric blue remains the action signal.
- Warning, error, and success retain semantic roles.

### Never

- Purple as a brand color.
- Gradients.
- Glassmorphism.
- Neon cyberpunk styling.
- Cream SaaS backgrounds.
- Decorative color with no state meaning.

## Typography

- UI/body: Geist.
- Data, endpoints, tokens, IDs, JSON, timestamps: Geist Mono.
- Do not use mono for ordinary prose or navigation.
- Page titles are compact and medium-bold, not oversized marketing display text.
- Table headers are small, tracked, uppercase labels.
- Numeric operational values use tabular alignment.

## Geometry

- Default radius: 3–5px.
- Dialogs/drawers may use up to 8px.
- Tables and main work surfaces generally use square edges.
- Shadows are reserved for floating overlays and the public routing visual.
- No pill-shaped containers except genuine compact status controls when shape aids recognition.

## Admin shell

### Desktop

- 216px dark left rail; 56px when collapsed.
- Rail contains brand, six primary destinations, collapse control, and connection state.
- Active destination: blue signal plus a restrained tinted row.
- Top utility bar: page title, short subtitle, connection state, theme, auth action.
- Main canvas spans the available width. Avoid arbitrary narrow max-widths on workbench pages.

Primary destinations:

1. Overview
2. API Keys
3. Client Tokens
4. Usage
5. Playground
6. Settings

### Mobile

- Desktop rail disappears.
- Persistent dark bottom navigation carries the six primary destinations.
- Header keeps page title plus essential utility actions; connection metadata is hidden.
- Tables collapse into horizontally scrollable or structured register views without losing field priority.

## Common components

### Buttons

- 32–38px height depending on emphasis.
- 4px radius.
- Primary action: solid electric blue.
- Secondary: neutral surface with strong rule.
- Ghost: no border until interaction.
- Destructive: red semantics only.
- Always show focus-visible state.

### Inputs

- Neutral surface, 1px strong border, 4px radius.
- Focus uses blue border plus restrained blue focus ring.
- Placeholder is visibly lower contrast than entered content.

### Status

- Small rectangular chips, not oversized pills.
- Text and color must both communicate state.
- Never rely on color alone.

### Tables / registers

- Continuous horizontal rules.
- Strong top/header rule; lighter row rules.
- Header background is a slightly sunken neutral.
- Row hover is a very subtle blue-tinted surface.
- Prefer direct row scanning over placing each row in a card.

### Cards

Cards are not a default layout primitive. A `.card` may remain as a semantic container in code, but visually it should normally behave as a ruled section without radius or shadow.

Use a floating card only when the object truly floats: dialog, drawer, popover, or similar overlay.

## Page rules

### Overview

- Treat the page as a control-plane ledger.
- KPI blocks form one ruled strip, separated by vertical rules.
- Provider / request metrics use broad shared surfaces, not a bento of floating cards.
- Recent activity is a continuous register.
- First-run setup appears as one dark-headed procedural register.

### API Keys

- Provider selection behaves like tabs on a rule.
- Key health, quota, last use, request count, and actions scan as one register.
- Bulk actions appear inline above the register.
- Secret-reveal actions remain explicit and high-trust.

### Client Tokens

- Token name, secret state, scope, usage, and lifecycle actions share one register.
- Mint, copy, reveal, revoke, and delete must remain unmistakable.
- Secret/security notices use semantic warning treatment, not decorative color.

### Usage

- Filters sit inline above data.
- Request records are the dominant surface.
- Detail data and JSON use mono only where it represents machine-readable values.
- Analytics should prioritize operational signal; avoid decorative charts.

### Playground

- This is the most technical surface.
- Desktop uses a full-width split workbench: Request / Response.
- Response is a dark inspector surface so machine output is visually distinct from configuration input.
- Request history is a ruled register below the workbench.
- Mobile stacks Request above Response while preserving the bottom navigation.

### Settings

- Use two-column ruled sections: section label on the left, controls on the right.
- Do not wrap every settings group in a card.
- Inline warnings appear next to the configuration that causes them.
- Environment/server notes use a restrained sunken register treatment.

## Public landing / login

The public surface uses the same design world as the admin console.

### Hero

Headline:

> One MCP search endpoint. Multiple upstreams. One control plane.

The primary visual is the product mechanism itself:

`MCP clients -> mcp / nexus -> Tavily / Brave`

The routing board should show representative control-plane state without claiming real production metrics.

### Features

Capabilities form a horizontal register, not a marketing card grid:

- Multi-provider key management
- Scoped client tokens
- Usage and cost observability
- Self-hosted Cloudflare deployment

### Login

- Compact fixed-width dialog.
- Clear admin-token field.
- Explicit remember-token choice.
- Errors are inline and specific.

## Interaction quality

- Hover states must clarify clickability, not add spectacle.
- Keyboard focus must always be visible.
- Disabled/loading/error/empty states must remain legible in both themes.
- Respect `prefers-reduced-motion`.
- Avoid animations unless they explain state change or spatial movement.

## Accessibility

- Body text and controls target WCAG AA contrast.
- Never encode health/status with color alone.
- Maintain semantic headings, labels, table headers, and ARIA behavior already present in the application.
- Minimum touch target should remain practical on mobile even when the visual density is high.

## Implementation

The redesign is applied as final visual layers:

- Admin: `packages/admin-ui/src/styles/network-ledger.css`
- Landing: `packages/landing-page/src/styles/network-ledger.css`

These files intentionally override the older Graphite & Cobalt styling while preserving existing component behavior and accessibility semantics.
