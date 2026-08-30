# Feature: <NAME>

- **ID:** <NNN-slug>
- **Status:** draft <!-- draft | clarified | planned | in-progress | shipped -->
- **Created:** <YYYY-MM-DD>

> Constitution III: this file says WHAT and WHY. No framework names, file paths,
> library choices or schemas — those belong in `plan.md`.

## Problem

Who is stuck, on what, today? One paragraph. If you cannot name the person and
the moment, the feature is not ready to specify.

## Outcome

What is true after this ships that is not true now? One paragraph, in the user's
language.

## Out of scope

Bullets. Being explicit here is what stops a plan from quietly tripling.

- ...

## User scenarios

### Scenario 1: <name>

- **Given** ...
- **When** ...
- **Then** ...

## Requirements

Each requirement is observable, independently checkable, and stable enough to
name a test after. Mark anything undecided with
`[NEEDS CLARIFICATION: the exact question]` — it blocks `/plan`.

| ID     | Requirement            | Acceptance             |
| ------ | ---------------------- | ---------------------- |
| FR-001 | <observable behaviour> | <how a test proves it> |

## Edge cases

What happens when the input is empty, huge, malformed, duplicated, or arrives
twice? Each answer that matters becomes a requirement above.

- ...

## Non-functional constraints

Only the ones this feature actually forces (a latency budget, an offline rule, a
data-retention limit). Delete the section if there are none — an empty constraint
list is honest; an invented one is noise.

## Open questions

- [ ] `[NEEDS CLARIFICATION: ...]`
