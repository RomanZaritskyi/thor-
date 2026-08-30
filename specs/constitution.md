# Project constitution

**Version 1.1.0 · Ratified 2026-08-30**

The rules every spec, plan and change in this repository must obey. When a plan
conflicts with the constitution, the constitution wins — or the constitution gets
amended first, deliberately, in its own commit.

---

## I. The spec is the source of truth

Code implements a spec; it never replaces one. Behaviour that is not written down
is not a requirement — it is an accident waiting to be "fixed" by the next person.

- Every user-visible behaviour traces to a numbered requirement (`FR-001`, …).
- Changing behaviour means changing the spec **in the same commit** as the code.
- If the code and the spec disagree, that is a bug in one of them. Decide which,
  then fix that one. Never silently keep both.

## II. One spec per feature; changed behaviour is edited in place

A feature gets exactly one folder under `specs/`. Before scaffolding a new one,
ask the only question that matters:

> **Does every requirement in the existing specs stay true after this change?**

**Yes — new folder.** The change adds behaviour without contradicting anything
already written. `pnpm spec:new "<name>"` takes the next number.

**No — edit the spec that is now wrong.** Loosening a limit, dropping something
from `Out of scope`, changing what a screen does: that is the same feature
evolving, and it is fixed where it lives, in the same commit as the code and the
test. A second folder describing the same behaviour differently leaves two
documents claiming to be the source of truth, and no way to tell which one is.

A spec therefore describes the **present**, never a history of changes. There is
no "previously this returned…" in a spec. Git already holds that:

```bash
git log -p specs/002-workout-log/spec.md
```

When a feature is removed, or its requirements are wholly replaced by a later
spec, set the status to `superseded` and add a line naming the replacement:

```markdown
- **Status:** superseded
- **Superseded by:** 007-workout-log-v2
```

`pnpm spec:check` then stops holding it to traceability — its code is gone — but
still requires the pointer to resolve. Deleting the folder outright is also fine;
what is not fine is leaving a shipped spec describing behaviour that no longer
exists.

The gate reads each feature folder on its own. It cannot see that spec 004
contradicts spec 001 — only `/analyze` and a reader can. That is precisely why
the rule above is a rule and not a preference.

## III. Requirements are testable or they are not requirements

A requirement that cannot fail a test is a wish.

- Write requirements as observable outcomes, not implementation notes.
  - Good: _FR-003 — selecting an exercise shows its most recent session._
  - Bad: _the history view calls a lookup function._
- Anything genuinely undecided is marked `[NEEDS CLARIFICATION: question]` and
  blocks `/plan` until resolved. Guessing silently is the failure mode this whole
  workflow exists to prevent.

## IV. Specs say WHAT and WHY; plans say HOW

`spec.md` contains no framework names, file paths, library choices or schemas.
It must stay readable by someone who does not know this codebase. All technical
decisions live in `plan.md`, where they can be challenged and replaced without
touching the definition of correct.

## V. Acceptance criteria become tests, before the implementation

Each `FR-xxx` maps to at least one automated test that names it. Write the test,
watch it fail for the intended reason, then implement.

- Domain rules → unit tests (fast, no DOM).
- User-facing flows → component tests through the accessibility tree.
- Cross-cutting journeys and persistence → one Playwright test, not ten.

## VI. Domain logic stays pure and framework-free

Business rules live in plain modules — no React, no router, no fetch. They take
data and return data. This is what makes them cheap to test and cheap to keep
correct.

- Side effects (storage, network, clock, randomness) enter through an interface
  and are injected. `now()` and `createId()` are parameters, never globals.
- Dependencies point inward: UI → feature → domain. Never the reverse.

## VII. The type system is the first line of the spec

`strict` is on, and so are `noUncheckedIndexedAccess`, `noUnusedLocals` and
`noUnusedParameters`.

- No `any`. No `as` to silence the compiler — narrow, or fix the type.
- Validate every value crossing a trust boundary (storage, network, URL) with a
  schema; parse, don't assume.
- A `@ts-expect-error` needs a comment saying what will remove it.

## VIII. Accessibility is a requirement, not a polish pass

Tests query by role, label and accessible name. If a control cannot be found that
way, that is a defect in the component, not in the test.

- Every input has a real `<label>`. Every icon-only button has an accessible name.
- Errors are announced (`role="alert"`) and tied to their field.

## IX. Simplicity gate

Every new dependency, abstraction layer or configuration option must be justified
in `plan.md` under **Complexity budget**, in one sentence, against the simpler
alternative it beats. No justification, no addition.

Three or fewer moving parts per feature unless the spec forces more.

## X. Definition of done

A change is done when **all** of these hold:

1. `pnpm verify` is green (format, lint, typecheck, unit tests, build).
2. `pnpm e2e` is green if the change touches a user journey.
3. Every `FR-xxx` in the spec is checked off in `tasks.md` and named by a test.
4. `pnpm spec:check` reports no unresolved clarifications or orphan requirements.

"It works on my machine" is not one of these.

---

## Amendments

The constitution changes by pull request, alone in its own commit, with the
version bumped and a line added below saying what changed and why.

| Version | Date       | Change                |
| ------- | ---------- | --------------------- |
| 1.0.0   | 2026-08-30 | Initial ratification. |
