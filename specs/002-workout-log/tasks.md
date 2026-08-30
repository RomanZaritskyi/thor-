# Tasks: Workout Log

- **Spec:** `specs/002-workout-log/spec.md`
- **Plan:** `specs/002-workout-log/plan.md`

> `[P]` marks tasks that touch disjoint files and may run in parallel.

## Setup

- [x] T001 — Swap dependencies: drop `react-hook-form` and `@hookform/resolvers`, add `idb` and `fake-indexeddb` · FR: —

## Slice 1 — domain and storage

### Tests first

- [x] T010 — Failing unit tests for name normalisation: case, trim, internal whitespace · FR: FR-009
- [x] T011 [P] — Failing unit tests for search: case, whitespace, no match, input untouched · FR: FR-002
- [x] T012 [P] — Failing unit tests for `todayKey` across a local-midnight boundary · FR: FR-015
- [x] T013 [P] — Failing unit tests for grouping and ordering, identical sets kept separate · FR: FR-006
- [x] T014 [P] — Failing unit tests for last-session selection, today excluded, none when absent · FR: FR-003, FR-004
- [x] T015 [P] — Failing unit tests for prefill: today first, previous session next, note not carried · FR: FR-020
- [x] T016 [P] — Failing unit tests for set validation: 0 reps, fractional reps, negative and non-finite weight, note trimming · FR: FR-007, FR-014
- [x] T017 — Failing unit tests for export/import: round-trip, bad JSON, schema failure, unknown version, orphan sets · FR: FR-017, FR-018
- [x] T018 — Failing store tests against `fake-indexeddb`: round-trip across connections, delete, replaceAll · FR: FR-010, FR-018
- [x] T019 — Failing store tests for unreadable data: reports rather than empties, hands back readable rows, does not repair · FR: FR-012
- [x] T020 — Failing repository tests: duplicates, unknown exercise, past-day immutability, and **no store call** while unreadable · FR: FR-005, FR-009, FR-012, FR-013, FR-016

### Implementation

- [x] T030 — `model.ts` · FR: FR-002, FR-003, FR-004, FR-006, FR-007, FR-009, FR-014, FR-015, FR-020
- [x] T031 — `transfer.ts` · FR: FR-017, FR-018
- [x] T032 — `store.ts`: port, IndexedDB adapter, memory adapter, load result · FR: FR-010, FR-012
- [x] T033 — `repository.ts`: CRUD, injected clock and ids, the write gate · FR: FR-005, FR-008, FR-013, FR-016

## Slice 2 — screens

### Tests first

- [x] T040 — Failing component tests for the picker: list, search, both empty states, add, duplicate refusal, blank refusal · FR: FR-001, FR-002, FR-008, FR-009
- [x] T041 — Failing component tests for the exercise screen: previous session, no-history state, note, recording, ordering, validation, prefill, delete today, no delete on past days · FR: FR-003, FR-004, FR-005, FR-006, FR-007, FR-014, FR-016, FR-020

### Implementation

- [x] T050 — `strings.ts`, `repository-context.ts`, `repository-provider.tsx`, `queries.ts` · FR: —
- [x] T051 — `components/exercise-picker.tsx` · FR: FR-001, FR-002, FR-008, FR-009
- [x] T052 — `components/set-list.tsx`, `components/record-set-form.tsx` · FR: FR-006, FR-007, FR-014, FR-016, FR-020
- [x] T053 — `components/exercise-screen.tsx` · FR: FR-003, FR-004, FR-005
- [x] T054 — Routes `/` and `/exercise/$exerciseId`, provider in `main.tsx` · FR: FR-001, FR-002

## Slice 3 — offline, transfer, resilience

### Tests first

- [x] T060 — Failing component tests for the transfer panel: export contents, the replacement count before anything happens, confirm, decline, round-trip, invalid file · FR: FR-017, FR-018, FR-019
- [x] T061 — Failing component tests for the data guard: blocks the app, reports the reason, salvage export, two-step erase · FR: FR-012

### Implementation

- [x] T070 — `download.ts`, `components/transfer-panel.tsx`, route `/data` · FR: FR-017, FR-018, FR-019
- [x] T071 — `components/data-guard.tsx`, wired into the root layout · FR: FR-012
- [x] T072 — `vite-plugin-pwa` with manifest, precache and `clientsClaim`; `initPwa` requests persistent storage · FR: FR-011

## Verification

- [x] T080 — `pnpm verify` green · FR: —
- [x] T081 — Playwright journeys: open, add, record, reload, filter through the URL, delete · FR: FR-001, FR-002, FR-005, FR-008, FR-010, FR-016
- [x] T082 — Playwright cold start with the network disabled · FR: FR-011
- [x] T083 — Spec status set to `shipped`; `pnpm spec:check` clean · FR: —

## Notes from implementation

- The screen computed "today" from its own clock while the repository used the
  injected one. They agreed in production except for one second either side of
  midnight — enough to file a set under a day the screen was not showing. The
  repository now owns `today()`.
- The prefill was first synced with an effect, which the React Compiler's lint
  rejects as cascading renders. Replaced by keying the form on the prefill, which
  is React's own answer and clears the note field for free.
- `vite-plugin-pwa` sets `skipWaiting` but not `clientsClaim`, so the app only
  became offline-capable on the second launch. On a gym floor that is the launch
  that matters, so `clientsClaim` is on.
- The first PWA wiring imported `virtual:pwa-register`, which pulls in
  `workbox-window`. `injectRegister: 'script'` gets registration without the
  dependency.
