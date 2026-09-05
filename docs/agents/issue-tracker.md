# Issue tracker: GitHub

Issues and specs for this repository live in GitHub Issues for `ykq007/mcp-nexus`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, also fetching labels when needed.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- **Close**: `gh issue close <number> --comment "..."`.

Run GitHub commands from inside this clone so `gh` infers `ykq007/mcp-nexus` from `origin`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares one number space across issues and PRs. If a bare `#<number>` is ambiguous, try `gh pr view <number>` and fall back to `gh issue view <number>`.

## Skill operations

- When a skill says **publish to the issue tracker**, create a GitHub issue.
- When a skill says **fetch the relevant ticket**, run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`:

- **Map**: one issue labelled `wayfinder:map`, containing Notes, Decisions-so-far, and Fog.
- **Child ticket**: link as a GitHub sub-issue when available; otherwise use a task list in the map plus `Part of #<map>` in the child. Label with `wayfinder:<type>`.
- **Blocking**: prefer GitHub native issue dependencies; fall back to a `Blocked by: #<n>` line only when necessary.
- **Frontier**: choose the first open, unassigned child with no open blockers.
- **Claim**: `gh issue edit <n> --add-assignee @me`.
- **Resolve**: comment with the answer, close the issue, then record the decision/context pointer on the map.
