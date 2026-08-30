# Plan: <NAME>

- **Spec:** `specs/<NNN-slug>/spec.md`
- **Status:** draft <!-- draft | approved | implemented -->

> How the spec becomes code. If the spec changes, this file is re-derived — never
> the other way round.

## Constitution check

| Principle                      | How this plan complies | Deviation + justification |
| ------------------------------ | ---------------------- | ------------------------- |
| IV. Tests before code          |                        |                           |
| V. Pure, framework-free domain |                        |                           |
| VI. Types and parsing          |                        |                           |
| VII. Accessibility             |                        |                           |
| VIII. Simplicity budget        |                        |                           |

A deviation is allowed; an unexplained one is not.

## Approach

Two or three paragraphs. What is the shape of the solution, and what did you
reject on the way? Name the alternative and why it lost — that is the part
future-you will want.

## Data and contracts

Types, schemas and the shape of anything crossing a trust boundary. State which
values are parsed rather than trusted.

## Modules

| Path                        | Responsibility | New / changed |
| --------------------------- | -------------- | ------------- |
| `src/features/<x>/model.ts` | pure rules     | new           |

## Requirement → design map

Every `FR-xxx` from the spec appears exactly once.

| FR     | Where it lives   | How it is proven |
| ------ | ---------------- | ---------------- |
| FR-001 | `model.ts::<fn>` | unit test        |

## Complexity budget

Every new dependency or layer, one line each, against the simpler option it beat.

- ...

## Risks

What could make this plan wrong? What would we see first if it were?

- ...
