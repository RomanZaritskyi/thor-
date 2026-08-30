---
description: Execute a task list, tests first, ticking boxes as you go
argument-hint: [spec id, or a task id like T012]
allowed-tools: Bash(pnpm:*), Bash(node scripts/:*), Bash(git status:*), Bash(git diff:*), Read, Write, Edit, Glob, Grep
---

Implement: **$ARGUMENTS**
(no argument: the newest feature with unchecked tasks; work them in order).

## Loop, one task at a time

1. Read the task, and the `FR-xxx` it names in the spec. The requirement — not
   the task title — is the definition of correct.
2. If it is a test task: write the test, run it, and **confirm it fails for the
   reason you expect**. A test that passes before the implementation exists is
   testing nothing; fix it before moving on.
3. If it is an implementation task: write the smallest change that makes its
   tests pass. Resist adding what the spec did not ask for.
4. Run the narrow check first (`pnpm test <file>`), then tick the box in
   `tasks.md`.
5. Move to the next task. Do not batch ticks — an accurate `tasks.md` mid-run is
   what makes the work resumable.

## Hard rules

- **Never weaken a test to make it pass.** Not by deleting an assertion, not by
  loosening a matcher, not by skipping it. A failing test is information; a
  disabled one is a lie.
- If the code cannot satisfy the spec, stop and say so. The spec may be wrong —
  that is a legitimate finding, and it is fixed in `spec.md`, not worked around
  in the implementation.
- Behaviour that turns out to be needed but is unspecified: add the `FR-xxx` to
  the spec in the same change, or leave it out. Never both undocumented and
  implemented.
- Obey `CLAUDE.md`'s stack constraints — especially the React Compiler rules.

## Finish

Run `pnpm verify`, and `pnpm e2e` if a user journey changed. Then run
`pnpm spec:check`. Set the spec status to `shipped`.

Report: tasks completed, tests added, the verify/e2e result, and anything you
found that contradicts the spec.
