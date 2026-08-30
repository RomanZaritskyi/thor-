# Project constitution

**Version 1.0.0 · Ratified 2026-08-30**

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

## II. Requirements are testable or they are not requirements

A requirement that cannot fail a test is a wish.

- Write requirements as observable outcomes, not implementation notes.
  - Good: _FR-004 — pinned notes appear above unpinned notes._
  - Bad: _the list uses a sort function._
- Anything genuinely undecided is marked `[NEEDS CLARIFICATION: question]` and
  blocks `/plan` until resolved. Guessing silently is the failure mode this whole
  workflow exists to prevent.

## III. Specs say WHAT and WHY; plans say HOW

`spec.md` contains no framework names, file paths, library choices or schemas.
It must stay readable by someone who does not know this codebase. All technical
decisions live in `plan.md`, where they can be challenged and replaced without
touching the definition of correct.

## IV. Acceptance criteria become tests, before the implementation

Each `FR-xxx` maps to at least one automated test that names it. Write the test,
watch it fail for the intended reason, then implement.

- Domain rules → unit tests (fast, no DOM).
- User-facing flows → component tests through the accessibility tree.
- Cross-cutting journeys and persistence → one Playwright test, not ten.

## V. Domain logic stays pure and framework-free

Business rules live in plain modules — no React, no router, no fetch. They take
data and return data. This is what makes them cheap to test and cheap to keep
correct.

- Side effects (storage, network, clock, randomness) enter through an interface
  and are injected. `now()` and `createId()` are parameters, never globals.
- Dependencies point inward: UI → feature → domain. Never the reverse.

## VI. The type system is the first line of the spec

`strict` is on, and so are `noUncheckedIndexedAccess`, `noUnusedLocals` and
`noUnusedParameters`.

- No `any`. No `as` to silence the compiler — narrow, or fix the type.
- Validate every value crossing a trust boundary (storage, network, URL) with a
  schema; parse, don't assume.
- A `@ts-expect-error` needs a comment saying what will remove it.

## VII. Accessibility is a requirement, not a polish pass

Tests query by role, label and accessible name. If a control cannot be found that
way, that is a defect in the component, not in the test.

- Every input has a real `<label>`. Every icon-only button has an accessible name.
- Errors are announced (`role="alert"`) and tied to their field.

## VIII. Simplicity gate

Every new dependency, abstraction layer or configuration option must be justified
in `plan.md` under **Complexity budget**, in one sentence, against the simpler
alternative it beats. No justification, no addition.

Three or fewer moving parts per feature unless the spec forces more.

## IX. Definition of done

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
