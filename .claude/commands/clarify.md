---
description: Resolve the open questions in a spec before planning starts
argument-hint: [spec id, e.g. 001-notes — defaults to the newest draft]
allowed-tools: Bash(git status:*), Read, Write, Edit, Glob, Grep, AskUserQuestion
---

Resolve the open questions in the spec for: **$ARGUMENTS**
(no argument: the most recent spec whose status is `draft`).

## Process

1. Read the spec and collect every `[NEEDS CLARIFICATION: ...]` marker plus any
   requirement that is vague enough to be untestable.
2. Rank them by blast radius: a question that changes the data model or the
   user's mental model outranks a wording choice.
3. Ask the user with `AskUserQuestion`, **at most four at a time**, highest
   impact first. Every option needs a one-line consequence — what becomes true
   if they pick it. Where there is a sensible default, put it first and mark it
   `(Recommended)`.
4. Apply each answer to the spec immediately: replace the marker with a concrete
   requirement, adding a new `FR-xxx` where the answer creates new behaviour.
5. Repeat until no markers remain.

## Rules

- Never resolve a marker by guessing. If the user cannot decide, record the
  decision as deferred, move the behaviour to `Out of scope`, and say so.
- An answer that contradicts an existing requirement is a conflict, not an
  update: surface it and ask which one wins.
- Set the spec status to `clarified` only when zero markers remain.

## When you are done

Report each question with the answer chosen and the requirement it changed, then
recommend `/plan`.
