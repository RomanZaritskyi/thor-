# Spec-driven development, concretely

The premise is narrow and old: **decide what "correct" means before deciding how
to build it, and write the decision down where it can be checked.** What is new
is that the write-down is now also the brief for a coding agent, which makes the
cost of a vague requirement immediate rather than eventual.

## Why the ceremony exists

An agent asked to "add tags to notes" will produce something. It will pick a
separator, a case-sensitivity rule, a maximum count, and a behaviour for
duplicates — silently, plausibly, and differently next time. Those choices are
the feature. Writing them down first is not bureaucracy; it is the difference
between reviewing a decision and archaeologically reconstructing one.

The same applies to people. The spec is where "obviously it should…" goes to be
disagreed with cheaply.

## The artifacts

Each feature is a folder under `specs/`, created by `pnpm spec:new "<name>"`:

```
specs/001-notes/
├── spec.md    WHAT and WHY   — no technology, readable by a non-developer
├── plan.md    HOW            — architecture, contracts, rejected alternatives
└── tasks.md   IN WHAT ORDER  — commit-sized units, tests before implementation
```

The separation is load-bearing. When the framework changes, `plan.md` is
rewritten and `spec.md` does not move — because the definition of correct did not
change. If a technology name creeps into `spec.md`, that boundary is gone and the
spec starts aging with the stack.

## The numbering

Requirements get stable ids: `FR-001`, `FR-002`. They appear in the spec table,
in the plan's design map, in task lines, and in test titles:

```ts
it('moves a pinned note to the top (FR-004)', async () => { … })
```

That id is the whole traceability mechanism. `pnpm spec:check` reads the spec,
then greps `tasks.md`, `plan.md` and every test file for each id, and fails when
a shipped requirement has no test naming it. It is a grep, not a proof — but it
reliably catches the failure that matters: a requirement everyone forgot.

## The loop

```
/specify   idea      → spec.md with [NEEDS CLARIFICATION] markers where it is genuinely undecided
/clarify   questions → the markers become requirements, one answered question at a time
/plan      design    → plan.md; refuses to run while markers remain
/tasks     breakdown → tasks.md, failing tests first
/implement build     → code, ticking boxes as it goes
/analyze   audit     → drift report across spec, plan, tasks, tests and code
```

`/clarify` is the step people skip and the step that pays. Three to seven open
questions on a first draft is a healthy sign — it means the spec noticed what the
request left out instead of quietly inventing answers.

## Where it earns its keep

- **Reviews get shorter.** "Does this match FR-003?" is answerable. "Is this
  right?" is not.
- **Regressions get names.** A bug is a requirement that was wrong, missing, or
  untested — and the spec says which.
- **Agent work becomes reviewable.** You review the spec, which is short and in
  your language, instead of the diff, which is long and in the machine's.
- **The stack becomes replaceable.** Specs outlive plans on purpose.

## Where it does not

Not everything deserves a spec. A dependency bump, a rename, a typo, a refactor
with no behaviour change — just do those. The rule is behavioural: **if a user
could notice the difference, it needs a requirement.** If they could not, it does
not.

A spec written after the fact to satisfy a checklist is worse than no spec: it
looks like a decision record and is actually a transcript. If you find yourself
writing one, that is a signal to stop and ask what decision was actually made.

## Worked example

`specs/001-notes/` is a real feature with eight requirements, carried end to end.
Read `spec.md` first, then `plan.md`'s **Risks** section — it documents a genuine
incompatibility between the React Compiler and `react-hook-form` that the loop
surfaced as a failing test rather than as a production bug. That is the argument
for the whole exercise, in one paragraph.
