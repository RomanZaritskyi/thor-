---
description: Derive a technical plan from a clarified spec
argument-hint: [spec id, e.g. 002-workout-log — defaults to the newest clarified spec]
allowed-tools: Bash(pnpm:*), Bash(git status:*), Read, Write, Edit, Glob, Grep
---

Produce the implementation plan for: **$ARGUMENTS**
(no argument: the most recent spec with status `clarified`).

## Refuse to start if

The spec still contains `[NEEDS CLARIFICATION]`. Say which markers remain and
stop — run `/clarify` first. Planning around an unknown is how a spec-driven
project quietly becomes a guess-driven one.

## Before you write

1. Read `specs/constitution.md` and the spec in full.
2. Read `CLAUDE.md` for the stack's hard-won constraints.
3. **Read the actual code** you intend to touch or imitate. The plan must
   describe this repository, not a generic React app.

## Write the plan

Follow `specs/templates/plan-template.md`.

- Fill the **Constitution check** table honestly. A deviation with a stated
  reason is fine; an unticked box with no explanation is not.
- The **Requirement → design map** must list every `FR-xxx` from the spec exactly
  once. A requirement with nowhere to live means the plan is incomplete.
- Under **Approach**, name at least one alternative you rejected and why. If you
  cannot name one, you have not designed anything yet.
- Fill **Complexity budget** for every new dependency or layer. Prefer what the
  repo already has: the stack is deliberately small.
- Push business rules into pure modules; keep React, the router and storage at
  the edges (Constitution VI).

## When you are done

Report: the plan path, the modules you will add or change, any constitution
deviation, and every new dependency with its justification. Recommend `/tasks`.

Do not write implementation code in this step.
