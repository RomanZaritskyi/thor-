# Tasks: Notes

- **Spec:** `specs/001-notes/spec.md`
- **Plan:** `specs/001-notes/plan.md`

> `[P]` marks tasks that touch disjoint files and may run in parallel.

## Setup

- [x] T001 — Feature folder, schemas (`Note`, `NoteDraft`) and shared test helpers (`buildNote`, `createTestRepository`, `renderApp`) · FR: —

## Tests first

- [x] T010 — Failing unit tests for `filterNotes`: case-insensitive, whitespace-trimmed, empty query, no match, input not mutated · FR: FR-002
- [x] T011 [P] — Failing unit tests for `sortNotes`: pinned first, recency within a group, deterministic tie-break, input not mutated · FR: FR-004
- [x] T012 [P] — Failing unit tests for `noteDraftSchema`: trimming, blank title, 80/2000 limits · FR: FR-003
- [x] T013 [P] — Failing unit tests for the localStorage adapter: round-trip, absent key, malformed JSON, schema-invalid payload, storage that throws on read and on write · FR: FR-006
- [x] T014 — Failing unit tests for the repository: create defaults, unique ids, pin bumps `updatedAt`, remove, unknown id rejects · FR: FR-004, FR-005
- [x] T015 — Failing component test: every stored note is rendered · FR: FR-001
- [x] T016 [P] — Failing component tests: create a note, create several in a row, invalid title writes nothing · FR: FR-003
- [x] T017 [P] — Failing component tests: search filters the list; pinning moves a note to the top · FR: FR-002, FR-004
- [x] T018 [P] — Failing component tests: both empty states; delete confirmed and declined · FR: FR-005, FR-007

## Implementation

- [x] T020 — `model.ts`: `filterNotes`, `sortNotes`, `selectVisibleNotes`, schemas · FR: FR-002, FR-003, FR-004
- [x] T021 — `store.ts`: `NotesStore` port, memory adapter, fail-soft localStorage adapter · FR: FR-006
- [x] T022 — `repository.ts`: CRUD with injected clock and id generator, `NoteNotFoundError` · FR: FR-004, FR-005
- [x] T023 — `repository-context.ts` + `repository-provider.tsx`: injection seam · FR: —
- [x] T024 — `queries.ts`: query keys, `useNotes`, and the three mutation hooks · FR: FR-001
- [x] T025 — `note-form.tsx`: labelled fields, inline errors, reset after success · FR: FR-003
- [x] T026 — `note-card.tsx`: title, body, pin and delete with accessible names · FR: FR-004, FR-005
- [x] T027 — `notes-page.tsx`: composition, search box, three empty/loading states · FR: FR-001, FR-002, FR-007

## Wiring

- [x] T030 — `src/routes/notes/index.tsx`: route, `?q=` parsing, provider, root-layout link · FR: FR-008

## Verification

- [x] T040 — `pnpm verify` green · FR: —
- [x] T041 — Playwright covers add + reload, invalid title, URL filter, pin, delete · FR: FR-002, FR-003, FR-004, FR-005, FR-006, FR-008
- [x] T042 — Spec status set to `shipped`; `pnpm spec:check` clean · FR: —

## Notes from implementation

- T025 initially reset the form inside the submit handler; react-hook-form
  finalises its state after the handler resolves, so the reset was clobbered and
  the second submit validated an empty title. Fixed by resetting from an effect
  on `isSubmitSuccessful`, and pinned by the "several notes in a row" test.
- The same test then failed again with the React Compiler enabled — `register()`
  is a render-time side effect the compiler is free to memoise away. Recorded in
  the plan's **Risks**; `note-form.tsx` opts out with `'use no memo'`.
