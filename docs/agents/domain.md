# Domain Docs

This repository uses a **multi-context** domain-documentation layout.

## Before exploring

- Read `CONTEXT-MAP.md` at the repository root if it exists. It maps repository contexts to their package-level `CONTEXT.md` files.
- Read the `CONTEXT.md` files relevant to the area being changed.
- Read relevant system-wide ADRs under `docs/adr/` if present.
- Read relevant package-scoped ADRs under `packages/<package>/docs/adr/` if present.

If any of these files do not exist, proceed silently. Do not create domain documentation speculatively. `/domain-modeling`, `/grill-with-docs`, and `/improve-codebase-architecture` may create or update it when real terminology or architectural decisions are resolved.

## Context layout

Repository contexts align with workspace packages under `packages/*`:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                         # system-wide decisions
└── packages/
    ├── admin-ui/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── bridge-server/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── bridge-stdio/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── core/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── db/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── landing-page/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── stdio-http-bridge/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    └── worker/
        ├── CONTEXT.md
        └── docs/adr/
```

## Vocabulary

Use domain terms exactly as defined by the relevant `CONTEXT.md`. Avoid introducing synonyms for established concepts. If a needed concept is missing, treat it as a domain-modeling gap rather than silently inventing vocabulary.

## ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding the decision.
