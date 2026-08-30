---
description: Break an approved plan into ordered, verifiable tasks
argument-hint: [spec id, e.g. 001-notes — defaults to the newest planned feature]
allowed-tools: Bash(git status:*), Read, Write, Edit, Glob, Grep
---

Break the plan into tasks for: **$ARGUMENTS**
(no argument: the most recent feature with a `plan.md` and no `tasks.md`).

## Before you write

Read the spec, the plan, and `specs/templates/tasks-template.md`.

## Rules

- **Tests come first.** For every `FR-xxx`, a failing test task precedes the
  implementation task that satisfies it (Constitution V). A plan whose task list
  starts with implementation is not spec-driven; it is spec-shaped.
- Every task is one commit-sized unit with a verifiable end state. "Improve the
  notes module" is not a task. "Sort pinned notes above unpinned in
  `model.ts::sortNotes`, proven by `model.test.ts`" is.
- Tag every task with the requirements it serves: `· FR: FR-001, FR-003`.
  Infrastructure tasks use `· FR: —`.
- Mark `[P]` only where the files genuinely do not overlap.
- Order by dependency, not by wishful thinking: types → pure rules → adapters →
  components → routes → e2e.
- Every `FR-xxx` in the spec must be referenced by at least one task. Check this
  before you finish; `pnpm spec:check` will check it again.

## When you are done

Report the task count, the parallelisable ones, and confirm that every `FR-xxx`
is covered. Recommend `/implement`.
