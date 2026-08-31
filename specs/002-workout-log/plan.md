# Plan: Workout Log

- **Spec:** `specs/002-workout-log/spec.md`
- **Status:** implemented

## Constitution check

| Principle                       | How this plan complies                                                                                                                                                                                       | Deviation + justification                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| V. Tests before code            | Every rule lands in `model.ts` with a unit test first; the storage adapter is tested against `fake-indexeddb`; each screen gets a component test; three journeys plus a cold offline start go to Playwright. | —                                                                                                           |
| VI. Pure, framework-free domain | `model.ts` and `transfer.ts` are plain functions over plain data. Storage sits behind a port; the clock and id generator are injected.                                                                       | —                                                                                                           |
| VII. Types and parsing          | Stored records, the imported file and the `?q=` search param are all parsed with a schema, never trusted.                                                                                                    | —                                                                                                           |
| VIII. Accessibility             | Labelled number inputs, accessible names on every control, errors announced and tied to their field. Tests query by role and label.                                                                          | —                                                                                                           |
| IX. Simplicity budget           | Three new dependencies, each justified below; two removed.                                                                                                                                                   | IndexedDB over localStorage is deliberate extra machinery — see **Approach**, it buys a decade of headroom. |

## Approach

The feature splits along the axis that decides what can be wrong independently.
**Rules** (`model.ts`, `transfer.ts`) are pure functions over arrays: searching,
ordering, picking the last session, validating a set, deciding what to prefill,
serialising and parsing a transfer file. None of them know storage exists.
**Persistence** sits behind a `WorkoutStore` port with an IndexedDB adapter and a
memory adapter. **Presentation** reads through TanStack Query hooks that resolve
the repository from context, which is what lets component tests inject a memory
repository with a frozen clock and deterministic ids.

Storage is IndexedDB rather than localStorage, and the arithmetic is the reason. A
set serialises to about 144 bytes; four sessions a week, six exercises, four sets
is roughly 5000 sets and 700 KB a year, so five years lands near 3.5 MB against
localStorage's ~5 MB ceiling. The ceiling is not even the worst part —
localStorage rewrites the entire history on every single set, and that cost grows
year over year at precisely the moment the user is standing at a machine waiting
for the app. IndexedDB appends one record. It also makes FR-012 tractable: one bad
row can be isolated and reported, where a single malformed localStorage blob is
all-or-nothing. Because the repository port is asynchronous either way, none of
this reaches the interface.

The rejected alternative was localStorage behind the same port, swapping later if
it hurt. It loses on migration: swapping after a year means writing a data-moving
path for real training history, which is exactly the data we least want to be
moving with code written in a hurry.

`react-hook-form` is dropped rather than used. Nothing imports it since the demo
was deleted, and this form is three fields that must arrive prefilled (FR-020) —
controlled by definition. Controlled inputs plus a `safeParse` on submit are fewer
moving parts and side-step the React Compiler's incompatibility with `register()`
entirely, which is a trap worth not re-arming.

## Data and contracts

- `Exercise` — `{ id, name, normalizedName, createdAt }`. `normalizedName` is
  trimmed, lowercased and internally whitespace-collapsed; it is the uniqueness
  key behind FR-009, stored rather than recomputed so the index can enforce it.
- `SetEntry` — `{ id, exerciseId, date, loggedAt, weightKg, reps, note? }`.
  `date` is a local `YYYY-MM-DD` key, not UTC: "today" in FR-015 and FR-016 means
  the user's calendar day, and a 23:58 set must not jump a day because the server
  thinks in UTC. `loggedAt` is a full timestamp and settles order within a day.
- `TransferFile` — `{ version: 1, exportedAt, exercises, sets }`. Versioned from
  the first release so a future format change has somewhere to branch.
- **Trust boundaries, all parsed:** every record read out of IndexedDB, the
  imported file, and `?q=` (coerced to a string, defaulting to empty, so a
  hand-edited URL cannot throw).
- **Load result** — reads return `{ status: 'ok', … }` or
  `{ status: 'unreadable', reason, partial }`. The repository refuses every write
  while unreadable, and no write path may run before a successful read.

## Modules

| Path                                           | Responsibility                                                                         | New / changed |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| `src/features/workout/model.ts`                | schemas, normalisation, search, ordering, last session, prefill                        | new           |
| `src/features/workout/strings.ts`              | every Ukrainian UI string, in one place                                                | new           |
| `src/features/workout/transfer.ts`             | export serialise, import parse and validate                                            | new           |
| `src/features/workout/store.ts`                | `WorkoutStore` port, IndexedDB adapter, memory adapter                                 | new           |
| `src/features/workout/repository.ts`           | CRUD over the port, injected clock and id generator                                    | new           |
| `src/features/workout/repository-context.ts`   | context + accessor hook                                                                | new           |
| `src/features/workout/repository-provider.tsx` | provider; exports only a component                                                     | new           |
| `src/features/workout/queries.ts`              | query keys and TanStack Query hooks                                                    | new           |
| `src/features/workout/components/*`            | picker, exercise screen, record form, set list, transfer panel, unreadable-data screen | new           |
| `src/routes/index.tsx`                         | picker route, `?q=` parsing                                                            | changed       |
| `src/routes/exercise.$exerciseId.tsx`          | exercise route                                                                         | new           |
| `src/routes/data.tsx`                          | export / import route                                                                  | new           |
| `vite.config.ts`                               | PWA plugin                                                                             | changed       |

Reused rather than rebuilt: `cn` (`src/lib/utils.ts`), the shadcn primitives in
`src/components/ui/`, `createQueryClient` (`src/lib/query-client.ts`), and
`renderApp` / `createTestQueryClient` (`src/test/utils.tsx`), wrapped locally with
the workout provider so `src/test/` stays feature-agnostic.

## Requirement → design map

| FR     | Where it lives                                               | How it is proven                                                                              |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| FR-001 | `routes/index.tsx`                                           | e2e: a cold open lands on the picker                                                          |
| FR-002 | `model.ts::searchExercises`                                  | unit tests for case, whitespace, substring, no match                                          |
| FR-003 | `model.ts::previousBlock`                                    | unit tests; component test on the exercise screen                                             |
| FR-004 | `components/exercise-screen`                                 | component test for the no-history message                                                     |
| FR-005 | `repository.ts::recordSet` + `components/record-set-form`    | component test: recording shows it in today's list                                            |
| FR-006 | `model.ts::groupSetsByDate` ordering by `loggedAt`           | unit test: identical sets are kept, in order                                                  |
| FR-007 | `model.ts::setDraftSchema`                                   | unit tests for 0 reps, negative weight, 2.5, 0                                                |
| FR-008 | `repository.ts::addExercise` + picker                        | component test: added and immediately findable                                                |
| FR-009 | `model.ts::normalizeExerciseName` + a unique index           | unit tests for case and whitespace variants                                                   |
| FR-010 | `store.ts` IndexedDB adapter                                 | store test round-trips through `fake-indexeddb`                                               |
| FR-011 | `vite.config.ts` PWA precache                                | e2e with the context offline from a cold start                                                |
| FR-012 | `store.ts` load result + `components/unreadable-data-screen` | store test: a corrupt row reports unreadable and **no write follows**                         |
| FR-013 | `repository.ts` accepts an id, never a name                  | unit test: recording against an unknown id rejects                                            |
| FR-014 | `model.ts` note field + `components/set-list`                | component test: the note shows beside the numbers                                             |
| FR-015 | `model.ts::isBlockOpen` + `repository.ts::recordSet`         | unit tests across a local-midnight boundary and a hand-closed block                           |
| FR-016 | `repository.ts::deleteSet` guarded by date                   | unit tests: today deletable including a closed block, an earlier day is not                   |
| FR-017 | `transfer.ts::exportData`                                    | unit test on the serialised shape                                                             |
| FR-018 | `transfer.ts::parseImport` + `repository.ts::replaceAll`     | unit test: export, record more, import, only the exported data remains                        |
| FR-019 | `components/transfer-panel`                                  | component tests: the count is named; declining changes nothing                                |
| FR-020 | `model.ts::prefillFrom`                                      | unit tests; component test that the fields follow the block in progress                       |
| FR-021 | `components/exercise-picker` empty states                    | component test distinguishing both states                                                     |
| FR-022 | `model.ts::exerciseNameSchema` + picker                      | unit test on the schema; component test that nothing is added                                 |
| FR-023 | `routes/__root.tsx` not-found + `components/exercise-screen` | e2e on an unknown URL; component test on an unknown exercise                                  |
| FR-024 | `repository.ts::finishExercise` + the screen                 | repository tests for block boundaries; component and e2e tests for the twice-in-a-day journey |

## Blocks (amendment)

The first version made the calendar day the unit of "last time". That was wrong
for the way its author trains: he uses whichever machine is free, so he comes back
to the same one later the same day — and the app had nothing to compare against,
because the morning's sets were merged into the same list as the evening's.

A **block** is now the unit: one run at one exercise. It closes when he finishes
it (FR-024) and, failing that, when the day turns (FR-015). The second half is not
a nicety: forgetting to press finish is certain, and a block left open overnight
would swallow tomorrow's first attempt into yesterday's numbers.

`previousBlock` therefore means "the most recent block that is not the one in
progress" — which resolves to this morning's run when he comes back to a machine,
and to the last day he did it when he comes to it fresh. One rule, both cases.

Rejected: an automatic gap of N hours, which needs no button but decides
invisibly and would be wrong exactly when it matters; and a workout-level object
grouping exercises, which is a second thing to forget to close for no gain, since
the premise is that today's session was never planned.

The existing database is migrated, not discarded. `blocksFromLegacySets` reads
pre-block data as what it actually was — one closed run per exercise per day —
and is used both by the IndexedDB upgrade and by importing a version 1 export, so
the rule that reinterprets somebody's training history exists once and is tested
on its own.

## Complexity budget

- **`idb` (8.0.3)** — a ~1.5 KB promise wrapper over IndexedDB's callback API.
  The alternative is roughly 60 lines of hand-rolled request wrapping that we
  would then have to test ourselves, to no benefit.
- **`vite-plugin-pwa` (1.3.0)** — FR-011 requires _opening_ the app with no
  network, which needs a precached service worker; nothing simpler does that. The
  manifest it generates also makes the app installable, which additionally exempts
  stored data from Safari's seven-day eviction of ordinary site data.
- **`fake-indexeddb` (6.2.5, dev)** — jsdom ships no IndexedDB; without it the
  adapter cannot be unit-tested at all.
- **Removed:** `react-hook-form` and `@hookform/resolvers`, unused and no longer
  wanted (see **Approach**).
- **No i18n library.** One language, one strings module. Revisit only if a second
  language is ever actually wanted.

## Risks

- **Eviction.** Browsers may clear site data under pressure. `navigator.storage
.persist()` is requested on first load and installation helps, but neither is a
  guarantee — which is what makes FR-017/FR-018 load-bearing rather than a nicety.
- **Local dates.** Every "today" decision depends on the device's timezone. Travel
  across zones can make a set land on a neighbouring day. Accepted: the
  alternative is storing offsets and reasoning about them everywhere, for a
  personal log used in one city.
- **A service worker serving stale assets.** Precaching can pin an old build.
  Registration uses auto-update so a new version takes effect on the next launch.
- **Empty and error states arrive unspecified.** FR-021 to FR-023 were written
  after the fact, when `/analyze` found three of them already built and tested
  with no requirement behind them. They are the states nobody thinks to specify
  and everybody eventually sees; the next feature should list them up front.
- **The migration touches real data.** The upgrade from version 1 rewrites every
  stored set to carry a block. It runs once, inside the IndexedDB upgrade
  transaction, and is covered by tests that seed a genuine version 1 database and
  assert the log still reads cleanly afterwards — because the failure mode is not
  a wrong number on screen, it is the app declaring a year of training unreadable.
- **FR-012 is easy to regress.** Any future code path that writes without first
  checking the load result quietly reintroduces exactly the data loss the
  requirement forbids. The guard lives in the repository, and its test asserts the
  absence of a write — the kind of test that only fails when it matters.
