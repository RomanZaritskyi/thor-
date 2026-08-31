# Feature: Workout Log

- **ID:** 002-workout-log
- **Status:** shipped <!-- draft | clarified | planned | in-progress | shipped | superseded -->

<!-- When superseded, add: - **Superseded by:** NNN-slug  (Constitution II) -->

- **Created:** 2026-08-30

> Constitution IV: this file says WHAT and WHY. No framework names, file paths,
> library choices or schemas — those belong in `plan.md`.

## Problem

The author records strength training on his phone, in a notes app, as a table of
exercise, weight and reps. The gym is crowded, so he does not follow a fixed
programme — he walks to whichever suitable machine is free. That one fact breaks
both ways of organising the notes.

One note per session scatters the history of any single exercise across dozens of
notes: answering "what did I lift on the lat pulldown last time" means opening
them one by one, guessing which day he last did it. One long note replaces that
with scrolling and searching a wall of rows. Either way the lookup happens
standing at the machine, with someone waiting for it, and it takes long enough
that he often skips it and guesses the weight instead.

Guessing is the actual loss. Progression is decided by the previous session's
numbers; without them the set is arbitrary and the log stops being useful for the
one thing it was kept for.

## Outcome

Standing at a free machine, he finds the exercise in seconds, sees what he lifted
for it last time — the weight and reps of each set, beside the set he is about to
do — and records today's sets in about the time it took to type one row into the
table.

The history is organised **by exercise, not by date**, because that is the
question actually being asked. The app never needs to know what today's workout
is supposed to be, because that is decided in the gym, by what is free.

The set beside him answers the next set (FR-030). Reading back through every
session of that one exercise answers a slower question the previous session
cannot: whether the weight has moved at all in the last month (FR-032).

## Out of scope

- Programmes, routines, templates, or any notion of a planned session. The
  premise of the product is that the plan does not exist.
- Rest timers and in-set countdowns.
- Charts, trend lines, volume totals, estimated one-rep maxes.
- Cardio, body weight, measurements, photos, nutrition.
- Accounts, sign-in, cloud sync, more than one device, sharing, anything social.
- Warm-up versus working sets, supersets, drop sets, RPE, tempo notation.
- More than one person's data.
- A workout as an object grouping several exercises, with its own start and
  finish. Blocks are per exercise (FR-024); a second level of state would be a
  second thing to forget to close, and the premise of the product is that today's
  session was never planned.
- A prebuilt exercise catalogue. The list starts empty and is filled by use, so
  it only ever contains machines this gym actually has.
- Units other than kilograms, and any distinction between bodyweight, assisted
  and added load — one number, with the note carrying the nuance (FR-007, FR-014).
- Scoping history to a specific machine. One history per exercise; where the
  machine matters, it goes in the set's note.
- Editing history. Every session before the one in progress is read-only
  (FR-016, FR-032); the only writes are recording today and deleting today.
- Searching or filtering history, and any range other than "all of it, newest
  first" (FR-032). One person's log of one exercise is short enough to read.
- Editing anything already recorded, and deleting anything from an earlier day
  (FR-016).
- Merging an imported file into existing data. Import replaces (FR-018);
  reconciling two divergent histories needs a rule for what counts as the same
  set, and that rule would silently be wrong sometimes.

## User scenarios

### Scenario 1: the lookup that the notes app cannot do

- **Given** the lat pulldown was last done two weeks ago
- **When** he selects it at the machine
- **Then** he sees that session's date and each set's weight and reps, without
  typing a search into a wall of text or opening several notes

### Scenario 2: logging while the machine is occupied by him

- **Given** he has selected an exercise
- **When** he finishes a set and records its weight and reps
- **Then** it joins today's sets for that exercise, on the same row as what he
  did for that set last time, so the comparison needs no remembering (FR-030)

### Scenario 3: a weight that has stopped moving

- **Given** he has pressed 80 kg on the leg press for several sessions
- **When** he opens that exercise's history
- **Then** he sees every session it has, newest first, and that 80 kg repeats —
  which the previous session alone cannot tell him (FR-032)

### Scenario 4: a machine he has never used

- **Given** the gym has a machine that is not in his list
- **When** he adds it by name
- **Then** it is immediately selectable and starts accumulating history, without
  a detour into a settings screen

## Requirements

| ID     | Requirement                                                                                                                                                                                                                                                                               | Acceptance                                                                                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | The app opens directly on exercise selection; no step precedes it.                                                                                                                                                                                                                        | A cold open shows the exercise search, not a dashboard, session list or menu.                                                                                                          |
| FR-002 | Typing narrows the exercise list by name, case- and whitespace-insensitively, matching anywhere in the name.                                                                                                                                                                              | Typing `pull` lists both `Lat pulldown` and `Pull-up`; ` PULL` lists the same.                                                                                                         |
| FR-003 | Selecting an exercise shows the previous block of sets for it — when that block happened, and every set's weight and reps — with no further interaction.                                                                                                                                  | With a block recorded eight days ago, selecting the exercise shows when it was and its sets.                                                                                           |
| FR-004 | An exercise with no history says so explicitly rather than showing an empty area.                                                                                                                                                                                                         | A newly added exercise shows a "no previous record" message, not a blank panel.                                                                                                        |
| FR-005 | A set is recorded against the selected exercise with its weight and reps, and appears in today's sets immediately.                                                                                                                                                                        | Recording 60 × 10 makes it the first entry in today's list for that exercise.                                                                                                          |
| FR-006 | Several sets of one exercise on one day keep the order they were recorded, including sets with identical numbers.                                                                                                                                                                         | Three sets of 60 × 10 read back as three entries, in order, not collapsed into one.                                                                                                    |
| FR-007 | Reps must be a whole number of at least 1. Weight is a single number in kilograms, zero or more, accepting half-plate fractions; a bodyweight exercise is recorded as `0`. An invalid entry explains which field is wrong and records nothing.                                            | `0` reps and `-5` kg are rejected with a message on the field; `2.5` and `0` kg are accepted.                                                                                          |
| FR-008 | An exercise absent from the list can be added by name and is immediately selectable.                                                                                                                                                                                                      | Adding `Hammer row` makes it findable by search in the same interaction.                                                                                                               |
| FR-009 | Two exercises cannot exist whose names differ only by case or surrounding whitespace, so history cannot silently fragment across near-duplicates.                                                                                                                                         | Adding `lat pulldown` when `Lat pulldown` exists does not create a second exercise.                                                                                                    |
| FR-010 | Everything recorded survives closing and reopening the app.                                                                                                                                                                                                                               | Sets recorded, then the app restarted, are still listed.                                                                                                                               |
| FR-011 | Every operation above works with no network connection.                                                                                                                                                                                                                                   | With the network disabled, opening the app, looking up an exercise and recording a set all succeed.                                                                                    |
| FR-012 | If stored data cannot be read, the app says so and does not overwrite it. Training history is never silently discarded and replaced by an empty log.                                                                                                                                      | Given unreadable stored data, the app reports the problem, and the unreadable data is still present afterwards.                                                                        |
| FR-013 | An exercise is always chosen from the stored list. A set cannot be recorded against a name that is not in it, so history cannot accumulate under a variant spelling.                                                                                                                      | Recording is impossible until an exercise is selected; a name typed but never added records nothing.                                                                                   |
| FR-014 | A set may carry an optional short note — which machine, which pin hole, how it felt. The note is shown wherever that set is shown, including in the previous-session view.                                                                                                                | A set saved with `Hammer, 3rd hole` shows that text beside its numbers when the exercise is next selected.                                                                             |
| FR-015 | A set joins the exercise's open block, after the sets already in it. A block opens on the first set recorded after the previous one closed, and never spans calendar days: a block from an earlier day counts as closed whether or not it was closed by hand.                             | Two sets recorded hours apart with no finish in between are the first and second set of one block; a set recorded the next morning starts a new one.                                   |
| FR-016 | A set recorded today can be deleted, including from a block already closed today. Sets from earlier days cannot be changed or removed, so the history behind a progression decision is stable.                                                                                            | Deleting today's second of three sets leaves the first and third, in order, whether or not that block is closed; a set from a previous day offers no delete.                           |
| FR-017 | Everything recorded can be written out to a file on demand, in a form that stays readable without this app.                                                                                                                                                                               | Exporting after recording produces a file containing those exercises, dates, weights, reps and notes.                                                                                  |
| FR-018 | An exported file can be read back in, restoring exactly what it holds. The import replaces everything currently recorded rather than merging into it.                                                                                                                                     | Exporting, recording more sets, then importing that file leaves only the exported data.                                                                                                |
| FR-019 | Import states how much existing data will be lost and proceeds only on confirmation. Declining changes nothing.                                                                                                                                                                           | With 40 sets recorded, importing warns that 40 will be replaced; declining leaves all 40 in place.                                                                                     |
| FR-020 | Weight and reps arrive prefilled with what was done at the same set position last time, so repeating a ramp needs no typing. Past the end of last time's block they fall back to the last set recorded in the block in progress. With neither, the fields start empty.                    | Last time's third set was 60 × 8, so with two sets recorded today the fields hold 60 and 8; with five recorded today against last time's three, they hold the set just recorded.       |
| FR-021 | The exercise list distinguishes having nothing recorded yet from having nothing that matches the current search.                                                                                                                                                                          | With no exercises at all the list invites adding the first one; with exercises but a non-matching search it says the search found nothing.                                             |
| FR-022 | An exercise name that is blank once trimmed is refused on the field, and nothing is added.                                                                                                                                                                                                | Submitting only spaces shows an error and leaves the list unchanged.                                                                                                                   |
| FR-023 | An address that does not resolve — an unknown route, or an exercise that is not in the list — says so in the app's language and offers the way back to the exercise list.                                                                                                                 | Opening an unknown URL, and opening an exercise id that no longer exists, each explain the situation and show a working link back.                                                     |
| FR-024 | Finishing an exercise closes its open block. The next set recorded for that exercise opens a new one, and the block just closed becomes what "last time" shows — so a second attempt at the same machine on the same day has the first attempt to build on.                               | After four sets, finishing, and recording again, the screen shows those four as the previous block and the new set as the only one in the current block.                               |
| FR-025 | An exercise can be renamed. Its history follows the rename, because sets belong to the exercise itself and not to what it is called. A name another exercise already holds is refused, as adding one is (FR-009); changing only the capitalisation or spacing of its own name is allowed. | Renaming an exercise with recorded sets shows the new name and the same history; renaming it to a name already in the list is refused with a message and changes nothing.              |
| FR-026 | An exercise with no recorded sets can be removed. One that has history cannot — renaming is the answer there, and nothing in the app deletes a training record.                                                                                                                           | A newly added exercise offers removal and disappears; once it has a set, removal is not offered.                                                                                       |
| FR-027 | Weight and reps can be adjusted in steps without typing — 2.5 kg and 1 rep. Weight never goes below zero, reps never below one. Typing remains available.                                                                                                                                 | From 80 kg one step up reads 82.5; at 0 kg and at 1 rep the downward step is unavailable; a set recorded after stepping carries the stepped value.                                     |
| FR-028 | The exercise list is ordered by when each exercise was last recorded, most recent first. Exercises never recorded follow, the most recently added of them first.                                                                                                                          | Of two exercises, the one recorded today appears above the one recorded last week; one never recorded appears below both.                                                              |
| FR-029 | Each exercise in the list says when it was last recorded, so work already done today is visible without opening it.                                                                                                                                                                       | An exercise recorded today reads "сьогодні"; one recorded three days ago reads "3 дн. тому"; one never recorded says nothing.                                                          |
| FR-030 | Today's sets and last time's are shown side by side, one row per set position: row 3 carries last time's third set next to today's third. Positions last time reached and today has not are shown too, marked as not yet done, so how much is left to match needs no counting.            | Five sets last time and three today shows five rows, the fourth and fifth carrying only last time's numbers; a position with nothing last time shows a dash.                           |
| FR-031 | History lists the exercises that have something recorded, most recently recorded first, each saying how many sessions it holds and when the last one was. An exercise never recorded is not in it.                                                                                        | With one exercise recorded twice and another never recorded, the list holds one entry reading two sessions; with nothing recorded at all it says so rather than showing an empty area. |
| FR-032 | Every session of one exercise can be read, newest first, each with when it happened and every set's weight and reps in the order they were recorded. It is reachable both from history and from the exercise itself.                                                                      | An exercise done three times shows three sessions, newest first, each with its own date and sets; a session whose sets were all deleted is not among them.                             |
| FR-033 | The app's sections are reachable from a bar at the bottom of every screen, within thumb reach, which says which section is showing.                                                                                                                                                       | The bar is present on the exercise list, on an exercise, on history and on data; while an exercise is open it marks the exercises section rather than none of them.                    |

## Edge cases

- **The same exercise twice in one day.** He returns to a machine later. If he
  finished the first attempt, the second opens a new block and the first is what
  "last time" shows (FR-024). If he did not finish it, the new sets continue the
  block he left open — the app does not guess that he walked away.
- **Identical sets.** 60 × 10 three times in a row is normal and must not be
  deduplicated (FR-006).
- **Today's run is a different length from last time's.** Fewer sets so far means
  the positions not yet reached still show what was done there, because how much
  is left is part of the decision. More sets than last time means positions with
  nothing to compare against, which say so rather than being hidden (FR-030).
- **Passing the end of last time's block.** There is no corresponding set to
  start from, so the fields hold the set just recorded instead — the only thing
  left that is about today (FR-020).
- **Midnight.** A set at 23:58 and the next at 00:03 land on different calendar
  days, so the second opens a new block even with no finish pressed (FR-015).
  Accepted, and deliberate: forgetting to finish is certain, and a block left
  open overnight would otherwise swallow the next day's first attempt into
  yesterday's numbers.
- **Finishing an exercise that has no open block.** Nothing to close, so the
  action is not offered.
- **Renaming an exercise that already has history.** The history follows the
  rename rather than being orphaned by it (FR-025) — sets belong to the exercise,
  not to its spelling.
- **An exercise added by mistake.** Removable while it has nothing recorded
  against it (FR-026). Once it has history, the way out is a rename.
- **A very long or emoji-laden exercise name.** Must not break the list or the
  search.
- **History of an exercise with one session.** Reads as one session, not as an
  error and not as an empty state — the first entry of a history is a history.
- **A session emptied by deletion.** Deleting every set of a run leaves no
  session to read, so it is absent from history (FR-032), exactly as it is absent
  from "last time" (FR-003).
- **The block in progress in history.** It appears, read-only. Deleting today's
  sets happens on the exercise screen, where the run in progress lives (FR-016);
  two places to delete the same set would be two places to get it wrong.
- **Nothing recorded at all.** History has no exercises to list, so it says that
  rather than showing an empty area (FR-031) — the same rule as the exercise list
  (FR-021).
- **First ever launch.** The list starts empty, so the very first action must be
  adding an exercise — the empty state has to lead there rather than being a dead
  end (FR-008, FR-021).
- **A stale link or a typed address.** An exercise deleted from an export, or a
  mistyped URL, must not present a blank screen with no way out (FR-023).
- **Unreadable stored data (FR-012).** For a demo, discarding it is acceptable.
  For years of training history it is not, which is why FR-012 is stricter than
  it would otherwise be.

## Non-functional constraints

- **One-handed, on a phone, in a gym.** Repeating a set must not mean typing two
  numbers from scratch (FR-020), and finishing an exercise is one deliberate tap, not a menu
  (FR-024). The lookup is the first thing on screen
  and the recording controls are reachable with a thumb. Precision tapping and
  typing long strings are both failure modes here. Moving between the app's
  sections is a thumb reach too, which is why navigation is at the bottom of the
  screen rather than the top (FR-033).
- **No network in the critical path.** Gym floors have poor reception; nothing in
  the flow above may wait on a server.
- **The data lives on the device.** A lost or replaced phone loses whatever was
  not exported. Export and import (FR-017, FR-018) make that recoverable, but
  both are manual: nothing backs anything up on its own.

## Open questions

None. All seven clarifications were resolved before planning.
