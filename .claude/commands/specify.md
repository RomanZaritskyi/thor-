---
description: Turn a feature idea into a numbered spec (WHAT and WHY only)
argument-hint: [what the feature should do]
allowed-tools: Bash(node scripts/new-feature.mjs:*), Bash(git status:*), Bash(git branch:*), Read, Write, Edit, Glob, Grep
---

Write a specification for: **$ARGUMENTS**

## Before you write

1. Read `specs/constitution.md`. It governs this document.
2. Read `specs/templates/spec-template.md`. Follow its structure exactly.
3. Skim existing `specs/*/spec.md` to match the house tone and to notice overlap
   with a feature that already exists.

## Decide first: new folder, or an edit? (Constitution II)

Read the existing `specs/*/spec.md` and answer one question:

> Does every requirement already written stay true after this change?

- **Yes** → new folder. Run `node scripts/new-feature.mjs "<short-slug>"`; it
  picks the next number, copies the templates and prints the paths. Do not
  hand-roll the numbering.
- **No** → **stop, and do not scaffold anything.** The change contradicts a spec
  that already exists — loosening a limit, removing an `Out of scope` line,
  redefining what a screen does. Say which spec and which `FR-xxx` is now wrong,
  and edit that file instead. Two folders describing the same behaviour leave two
  documents claiming to be the source of truth.

Say out loud which branch you took and why, before writing anything.

## Rules for the content

- **WHAT and WHY only.** No React, no file paths, no libraries, no schemas. If
  you catch yourself naming a technology, that sentence belongs in `plan.md`.
- Every requirement gets an `FR-xxx` id, an observable behaviour, and a sentence
  saying how a test would prove it.
- Cover the boring paths explicitly: empty input, too-long input, malformed
  stored data, an action repeated twice, nothing matching a filter.
- Where the request genuinely does not say, write
  `[NEEDS CLARIFICATION: <the precise question>]` rather than inventing an answer.
  Between three and seven of these on a first draft is healthy; zero usually
  means you guessed.
- Keep `Out of scope` honest and specific. It is the only thing that holds the
  plan's size down later.

## When you are done

Report: the spec path, the requirement count, and every open clarification as a
numbered list. Recommend `/clarify` if any remain, otherwise `/plan`.

Do not write any implementation code in this step.
