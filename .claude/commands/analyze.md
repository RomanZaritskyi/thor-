---
description: Find drift between spec, plan, tasks, tests and code
argument-hint: [spec id — defaults to every feature in specs/]
allowed-tools: Bash(pnpm:*), Bash(node scripts/:*), Bash(git log:*), Bash(git diff:*), Read, Glob, Grep
---

Audit for drift: **$ARGUMENTS** (no argument: every feature under `specs/`).

Read-only. Report; do not fix.

## Check, in this order

1. **Spec → tests.** Does every `FR-xxx` have a test that names it? Grep the test
   files for the id. A requirement no test mentions is unverified, whatever the
   coverage percentage says.
2. **Tests → spec.** Does every test assert behaviour some requirement describes?
   A test with no `FR` behind it is either dead weight or an undocumented
   requirement — say which you think it is.
3. **Spec → code.** Is each requirement actually implemented? Look at the code,
   not the task checkboxes.
4. **Code → spec.** Is there user-visible behaviour with no requirement behind
   it? This is the most common and most expensive drift.
5. **Plan → reality.** Do the modules in `plan.md` match what is on disk?
6. **Constitution.** Any violation: `any`, unparsed trust boundaries, business
   logic inside components, controls unreachable by role or label.
7. **Hygiene.** Unresolved `[NEEDS CLARIFICATION]`, stale statuses, tasks ticked
   with no corresponding code.

## Report

A table of findings — severity (blocker / should-fix / note), location, what is
wrong, and the smallest fix. Order by severity. End with one sentence on whether
the specs can still be trusted as the source of truth.

If nothing is wrong, say so plainly. A clean audit is a real result; do not
manufacture findings to look thorough.
