# Tasks: <NAME>

- **Spec:** `specs/<NNN-slug>/spec.md`
- **Plan:** `specs/<NNN-slug>/plan.md`

> Ordered, independently verifiable units. Each task names the requirements it
> serves so `pnpm spec:check` can prove nothing was dropped.
>
> `[P]` marks tasks that touch disjoint files and may run in parallel.

## Setup

- [ ] T001 — <scaffolding, fixtures, dependencies> · FR: —

## Tests first

Write these and watch them fail before writing the implementation (Constitution IV).

- [ ] T010 — <failing unit test for the rule> · FR: FR-001
- [ ] T011 [P] — <failing component test for the flow> · FR: FR-002

## Implementation

- [ ] T020 — <make T010 pass> · FR: FR-001
- [ ] T021 — <make T011 pass> · FR: FR-002

## Wiring

- [ ] T030 — <routes, providers, composition root> · FR: —

## Verification

- [ ] T040 — `pnpm verify` green · FR: —
- [ ] T041 — `pnpm e2e` covers the primary journey · FR: FR-001, FR-002
- [ ] T042 — spec status updated to `shipped` · FR: —
