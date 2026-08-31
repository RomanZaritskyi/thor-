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

| Path                                                   | Responsibility                                                                         | New / changed |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------- |
| `src/features/workout/model.ts`                        | schemas, normalisation, search, ordering, last session, prefill                        | new           |
| `src/features/workout/strings.ts`                      | every Ukrainian UI string, in one place                                                | new           |
| `src/features/workout/transfer.ts`                     | export serialise, import parse and validate                                            | new           |
| `src/features/workout/store.ts`                        | `WorkoutStore` port, IndexedDB adapter, memory adapter                                 | new           |
| `src/features/workout/repository.ts`                   | CRUD over the port, injected clock and id generator                                    | new           |
| `src/features/workout/repository-context.ts`           | context + accessor hook                                                                | new           |
| `src/features/workout/repository-provider.tsx`         | provider; exports only a component                                                     | new           |
| `src/features/workout/queries.ts`                      | query keys and TanStack Query hooks                                                    | new           |
| `src/features/workout/components/exercise-heading.tsx` | rename and remove, where the mistake is noticed                                        | new           |
| `src/features/workout/components/*`                    | picker, exercise screen, record form, set list, transfer panel, unreadable-data screen | new           |
| `src/routes/index.tsx`                                 | picker route, `?q=` parsing                                                            | changed       |
| `src/routes/exercise.$exerciseId.tsx`                  | exercise route                                                                         | new           |
| `src/routes/data.tsx`                                  | export / import route                                                                  | new           |
| `vite.config.ts`                                       | PWA plugin                                                                             | changed       |

Reused rather than rebuilt: `cn` (`src/lib/utils.ts`), the shadcn primitives in
`src/components/ui/`, `createQueryClient` (`src/lib/query-client.ts`), and
`renderApp` / `createTestQueryClient` (`src/test/utils.tsx`), wrapped locally with
the workout provider so `src/test/` stays feature-agnostic.

## Requirement → design map

| FR     | Where it lives                                                  | How it is proven                                                                                       |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| FR-001 | `routes/index.tsx`                                              | e2e: a cold open lands on the picker                                                                   |
| FR-002 | `model.ts::searchExercises`                                     | unit tests for case, whitespace, substring, no match                                                   |
| FR-003 | `model.ts::previousBlock`                                       | unit tests; component test on the exercise screen                                                      |
| FR-004 | `components/exercise-screen`                                    | component test for the no-history message                                                              |
| FR-005 | `repository.ts::recordSet` + `components/record-set-form`       | component test: recording shows it in today's list                                                     |
| FR-006 | `model.ts::groupSetsByDate` ordering by `loggedAt`              | unit test: identical sets are kept, in order                                                           |
| FR-007 | `model.ts::setDraftSchema`                                      | unit tests for 0 reps, negative weight, 2.5, 0                                                         |
| FR-008 | `repository.ts::addExercise` + picker                           | component test: added and immediately findable                                                         |
| FR-009 | `model.ts::normalizeExerciseName` + a unique index              | unit tests for case and whitespace variants                                                            |
| FR-010 | `store.ts` IndexedDB adapter                                    | store test round-trips through `fake-indexeddb`                                                        |
| FR-011 | `vite.config.ts` PWA precache                                   | e2e with the context offline from a cold start                                                         |
| FR-012 | `store.ts` load result + `components/unreadable-data-screen`    | store test: a corrupt row reports unreadable and **no write follows**                                  |
| FR-013 | `repository.ts` accepts an id, never a name                     | unit test: recording against an unknown id rejects                                                     |
| FR-014 | `model.ts` note field + `components/set-list`                   | component test: the note shows beside the numbers                                                      |
| FR-015 | `model.ts::isBlockOpen` + `repository.ts::recordSet`            | unit tests across a local-midnight boundary and a hand-closed block                                    |
| FR-016 | `repository.ts::deleteSet` guarded by date                      | unit tests: today deletable including a closed block, an earlier day is not                            |
| FR-017 | `transfer.ts::exportData`                                       | unit test on the serialised shape                                                                      |
| FR-018 | `transfer.ts::parseImport` + `repository.ts::replaceAll`        | unit test: export, record more, import, only the exported data remains                                 |
| FR-019 | `components/transfer-panel`                                     | component tests: the count is named; declining changes nothing                                         |
| FR-020 | `model.ts::nextSet` + `components/record-set-form` caption      | unit tests for the position hit, past the end of last time's block, and neither                        |
| FR-021 | `components/exercise-picker` empty states                       | component test distinguishing both states                                                              |
| FR-022 | `model.ts::exerciseNameSchema` + picker                         | unit test on the schema; component test that nothing is added                                          |
| FR-023 | `routes/__root.tsx` not-found + `components/exercise-screen`    | e2e on an unknown URL; component test on an unknown exercise                                           |
| FR-024 | `repository.ts::finishExercise` + the screen                    | repository tests for block boundaries; component and e2e tests for the twice-in-a-day journey          |
| FR-025 | `repository.ts::renameExercise` + `components/exercise-heading` | repository tests for collisions and history; component and e2e tests that the sets stay                |
| FR-026 | `repository.ts::removeExercise`                                 | repository test that history blocks it; component test that the control is absent once sets exist      |
| FR-027 | `model.ts::stepValue` + `components/record-set-form`            | unit tests for clamping, empty fields and float dust; component and e2e tests recording without typing |
| FR-028 | `model.ts::sortExercisesByRecency`                              | unit tests over recorded, older and never-recorded exercises; component test on render order           |
| FR-029 | `model.ts::lastRecordedSet` + `daysBetween`                     | unit tests; component test that the label is present and absent in the right cases                     |
| FR-030 | `model.ts::setRows` + `components/set-table`                    | unit tests over both blocks being longer; component and e2e tests reading the rows                     |
| FR-031 | `components/history-index` + `model.ts::sortExercisesByRecency` | component tests for order, the session count, an exercise with no history, and the empty state         |
| FR-032 | `model.ts::historyFor` + `components/history-screen`            | unit tests for order and an emptied block; component and e2e tests reading several sessions            |
| FR-033 | `components/bottom-nav` + `lib/nav.ts::activeSection`           | unit tests over every path; component test that an open exercise lights the exercises tab              |

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

The pre-block database is **not** migrated. It was, briefly: a function
reinterpreted old sets as one closed run per exercise per day, used by both the
IndexedDB upgrade and a version 1 import path. That machinery was built for people
who do not exist — the app has one user, testing it, whose stored sets were
recorded to see whether the screen works. Constitution IX asks what the complexity
beats, and the honest answer was "nothing".

So the upgrade discards what it can no longer read and keeps the exercises, whose
shape never changed. It is one line, it destroys data, and it is tested for
exactly that reason.

## Thumb-first (amendment)

The screens were built screen-first. Three things made the app slower than the
notes app it replaced, at the moment it is actually used — standing at a machine,
one hand free.

The exercise list was in **creation order**, so at twenty-five exercises the one
used yesterday sat in the middle. It is now ordered by when each was last recorded
(FR-028), with never-recorded ones after, newest addition first — an exercise just
added is about to be used. Each row says when it last happened (FR-029), so work
already done today is visible without opening anything.

Changing 80 → 82.5 meant tapping a field, waiting for the keyboard, selecting and
retyping. It is now one tap either side of the number (FR-027). The arithmetic
lives in `stepValue` rather than the component, because the awkward parts — an
empty field, a value that is not a number, floating-point dust from fractional
steps — are exactly what wants a unit test.

Two fixes were not new requirements but unmet ones: the non-functional constraints
already said precision tapping is a failure mode, and icon buttons were 36px. They
are 44px now, applied as a `className` at the call sites rather than by editing
`src/components/ui/button.tsx`, because that file is vendored and regenerated. And
_Закінчити вправу_ moved above the set list, so reaching it no longer depends on
how many sets are in it.

## The Previous column (amendment)

The screen stacked last time's sets, the form and today's sets, so the question it
exists to answer — am I ahead of last time on this set? — was answered by looking
up, holding two numbers, and looking back down. The numbers were both on screen
and the comparison still happened in the user's head.

They now share a row. One row per set position, last time's set beside today's
(FR-030). Rows run to `max(today, last time)`, so a position last time reached and
today has not still shows what was done there — how much is left to match is part
of the decision, and counting it is the work being removed.

`setRows` and `nextSet` take the `BlockWithSets | undefined` pair the screen has
already computed with `currentBlock` and `previousBlock`, rather than querying the
raw arrays again. That keeps the two selectors trivially testable — a pair of
blocks in, rows out, no ids or dates to construct — and leaves one lookup on the
screen instead of three.

`nextSet` replaces `prefillFrom`, and the behaviour genuinely changes: the fields
used to hold last time's **final** set and now hold the set at the same position
(FR-020). For a ramp 20 → 40 → 60 → 80 that is the difference between twenty-four
stepper taps and none; for straight sets the two agree, so the change is never a
regression. Past the end of last time's block there is no corresponding set, and
it falls back to the last one recorded today — the only thing left that is about
today.

Two consequences worth naming:

- **Deleting from a block closed earlier today (FR-016).** Those sets are in the
  Previous column, and a second delete button per row would be ambiguous about
  which set it acts on and would not fit a phone row anyway. A row's button acts
  on today's set; when the previous block is itself from today, a disclosure under
  the table expands it as the existing `set-list`, with its deletes. One control,
  one meaning.
- **_Закінчити вправу_ moved below the form.** The thumb-first pass put it above
  the set list so its position would not follow the list's length; the table is
  bounded by the previous block, so that reasoning is spent. Closing a run is
  better off needing a deliberate reach than sitting under the thumb that taps
  _Записати підхід_.

The screenshots that prompted this also showed rest timers, a workout-level
Finish/Cancel across several exercises, and _Add Exercises_. All three are already
refused in **Out of scope**, and the premise that today's session was never
planned is why. Only the column was taken.

## History, and a bar to reach it from (amendment)

`Out of scope` refused browsing anything older than the previous session, on the
grounds that stalling was "a later question, not this one". It arrived. The
previous block decides the next set; it cannot show that 80 kg has not moved in a
month, and that is the question a log is kept for. Constitution II puts the answer
here rather than in a third folder: dropping a line from `Out of scope` is the
same feature evolving.

Almost none of this is new logic. `blocksForExercise` already returns every block
of an exercise, newest first, with its sets — it was written for `previousBlock`
and is exactly the history query. `historyFor` is that minus blocks whose sets
were all deleted, and `previousBlock` is **rewritten on top of it**: that rule was
already applied privately inside `previousBlock`, and one rule in two places is one
rule too many. `set-list` renders a session read-only just by omitting `onDelete`.

`formatWhen` was a private function inside `exercise-screen.tsx`. History needs the
same words, so it moves to `format.ts`, beside `strings.ts` where the language
already lives, and finally gets unit tests.

Navigation moves to the bottom of the screen (FR-033), which is where a thumb is;
the top header is deleted rather than duplicated, and the height it was spending
goes back to the set table. `activeSection` is a pure function because
`activeProps` cannot express "`/` but also `/exercise/x`" — an open exercise must
light the exercises tab, not none of them — and because that is the kind of rule
that quietly breaks. It will hold the login tab without changing shape.

Two shell fixes ride along, neither a requirement, both simply wrong: `index.html`
declared `lang="en"` over an entirely Ukrainian app, which makes a screen reader
pronounce it as English; and the viewport meta had no `viewport-fit=cover`, without
which `env(safe-area-inset-bottom)` is zero and the new bar sits underneath the
iPhone home indicator.

History is read-only, deliberately. Today's sets are deleted on the exercise
screen, where the run in progress is; a second delete path to the same set is a
second path to delete the wrong one.

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
- **Discarding on upgrade only stays acceptable while there is one user.** The
  version 1 upgrade drops sets rather than converting them. That was a decision
  about test data on one phone, not a policy. The next schema change that meets
  real history has to migrate it, and the deleted `blocksFromLegacySets` is in git
  as the worked example of how.
- **FR-012 is easy to regress.** Any future code path that writes without first
  checking the load result quietly reintroduces exactly the data loss the
  requirement forbids. The guard lives in the repository, and its test asserts the
  absence of a write — the kind of test that only fails when it matters.
