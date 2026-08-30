# Feature: Workout Log

- **ID:** 002-workout-log
- **Status:** clarified <!-- draft | clarified | planned | in-progress | shipped | superseded -->

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
for it last time — the weight and reps of each set — and records today's sets in
about the time it took to type one row into the table.

The history is organised **by exercise, not by date**, because that is the
question actually being asked. The app never needs to know what today's workout
is supposed to be, because that is decided in the gym, by what is free.

## Out of scope

- Programmes, routines, templates, or any notion of a planned session. The
  premise of the product is that the plan does not exist.
- Rest timers and in-set countdowns.
- Charts, trend lines, volume totals, estimated one-rep maxes.
- Cardio, body weight, measurements, photos, nutrition.
- Accounts, sign-in, cloud sync, more than one device, sharing, anything social.
- Warm-up versus working sets, supersets, drop sets, RPE, tempo notation.
- More than one person's data.
- A prebuilt exercise catalogue. The list starts empty and is filled by use, so
  it only ever contains machines this gym actually has.
- Units other than kilograms, and any distinction between bodyweight, assisted
  and added load — one number, with the note carrying the nuance (FR-007, FR-014).
- Scoping history to a specific machine. One history per exercise; where the
  machine matters, it goes in the set's note.
- Browsing sessions older than the previous one. Selecting an exercise shows the
  last one and nothing else (FR-003); seeing whether a weight has stalled across
  several sessions is a later question, not this one.
- Editing anything already recorded, and deleting anything from an earlier day
  (FR-016).
- Reading an exported file back in. The export is a readable record, not a
  restore button: after a lost phone the data can be recovered by hand but not by
  the app. Accepted deliberately for a first version.

## User scenarios

### Scenario 1: the lookup that the notes app cannot do

- **Given** the lat pulldown was last done two weeks ago
- **When** he selects it at the machine
- **Then** he sees that session's date and each set's weight and reps, without
  typing a search into a wall of text or opening several notes

### Scenario 2: logging while the machine is occupied by him

- **Given** he has selected an exercise
- **When** he finishes a set and records its weight and reps
- **Then** it joins today's sets for that exercise, and the previous session's
  numbers stay visible for comparison

### Scenario 3: a machine he has never used

- **Given** the gym has a machine that is not in his list
- **When** he adds it by name
- **Then** it is immediately selectable and starts accumulating history, without
  a detour into a settings screen

## Requirements

| ID     | Requirement                                                                                                                                                                                                                                    | Acceptance                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| FR-001 | The app opens directly on exercise selection; no step precedes it.                                                                                                                                                                             | A cold open shows the exercise search, not a dashboard, session list or menu.                                           |
| FR-002 | Typing narrows the exercise list by name, case- and whitespace-insensitively, matching anywhere in the name.                                                                                                                                   | Typing `pull` lists both `Lat pulldown` and `Pull-up`; ` PULL` lists the same.                                          |
| FR-003 | Selecting an exercise shows its most recent recorded session — the date, and every set's weight and reps — with no further interaction.                                                                                                        | With a session recorded eight days ago, selecting the exercise shows that date and its sets.                            |
| FR-004 | An exercise with no history says so explicitly rather than showing an empty area.                                                                                                                                                              | A newly added exercise shows a "no previous record" message, not a blank panel.                                         |
| FR-005 | A set is recorded against the selected exercise with its weight and reps, and appears in today's sets immediately.                                                                                                                             | Recording 60 × 10 makes it the first entry in today's list for that exercise.                                           |
| FR-006 | Several sets of one exercise on one day keep the order they were recorded, including sets with identical numbers.                                                                                                                              | Three sets of 60 × 10 read back as three entries, in order, not collapsed into one.                                     |
| FR-007 | Reps must be a whole number of at least 1. Weight is a single number in kilograms, zero or more, accepting half-plate fractions; a bodyweight exercise is recorded as `0`. An invalid entry explains which field is wrong and records nothing. | `0` reps and `-5` kg are rejected with a message on the field; `2.5` and `0` kg are accepted.                           |
| FR-008 | An exercise absent from the list can be added by name and is immediately selectable.                                                                                                                                                           | Adding `Hammer row` makes it findable by search in the same interaction.                                                |
| FR-009 | Two exercises cannot exist whose names differ only by case or surrounding whitespace, so history cannot silently fragment across near-duplicates.                                                                                              | Adding `lat pulldown` when `Lat pulldown` exists does not create a second exercise.                                     |
| FR-010 | Everything recorded survives closing and reopening the app.                                                                                                                                                                                    | Sets recorded, then the app restarted, are still listed.                                                                |
| FR-011 | Every operation above works with no network connection.                                                                                                                                                                                        | With the network disabled, opening the app, looking up an exercise and recording a set all succeed.                     |
| FR-012 | If stored data cannot be read, the app says so and does not overwrite it. Training history is never silently discarded and replaced by an empty log.                                                                                           | Given unreadable stored data, the app reports the problem, and the unreadable data is still present afterwards.         |
| FR-013 | An exercise is always chosen from the stored list. A set cannot be recorded against a name that is not in it, so history cannot accumulate under a variant spelling.                                                                           | Recording is impossible until an exercise is selected; a name typed but never added records nothing.                    |
| FR-014 | A set may carry an optional short note — which machine, which pin hole, how it felt. The note is shown wherever that set is shown, including in the previous-session view.                                                                     | A set saved with `Hammer, 3rd hole` shows that text beside its numbers when the exercise is next selected.              |
| FR-015 | Recording requires no start or finish action. A set joins the sets already recorded for that exercise on the current calendar date, after them in order.                                                                                       | Two sets recorded hours apart on the same day appear as that day's first and second set.                                |
| FR-016 | A set recorded on the current date can be deleted. Sets from earlier dates cannot be changed or removed, so the history behind a progression decision is stable.                                                                               | Deleting today's second of three sets leaves the first and third, in order; a set from a previous day offers no delete. |
| FR-017 | Everything recorded can be written out to a file on demand, in a form that stays readable without this app.                                                                                                                                    | Exporting after recording produces a file containing those exercises, dates, weights, reps and notes.                   |

## Edge cases

- **The same exercise twice in one day.** He returns to a machine later. Those
  sets append to the same day's list for that exercise (FR-015); there is no
  second session to create.
- **Identical sets.** 60 × 10 three times in a row is normal and must not be
  deduplicated (FR-006).
- **Midnight.** A set at 23:58 and the next at 00:03 land on different calendar
  dates and are shown as two days. Accepted: sets are dated, not sessioned
  (FR-015), and a workout crossing midnight is rare enough not to buy a session
  object.
- **Renaming an exercise that already has history.** The history must follow the
  name, not be orphaned by it.
- **A very long or emoji-laden exercise name.** Must not break the list or the
  search.
- **First ever launch.** The list starts empty, so the very first action must be
  adding an exercise — the empty state has to lead there rather than being a dead
  end (FR-004, FR-008).
- **Unreadable stored data (FR-012).** For a demo, discarding it is acceptable.
  For years of training history it is not, which is why FR-012 is stricter than
  it would otherwise be.

## Non-functional constraints

- **One-handed, on a phone, in a gym.** The lookup is the first thing on screen
  and the recording controls are reachable with a thumb. Precision tapping and
  typing long strings are both failure modes here.
- **No network in the critical path.** Gym floors have poor reception; nothing in
  the flow above may wait on a server.
- **The data lives on the device.** A lost or replaced phone loses whatever was
  not exported; the export (FR-017) is the only mitigation, and it is manual.

## Open questions

None. All seven clarifications were resolved before planning.
