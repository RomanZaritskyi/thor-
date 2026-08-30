# Feature: Notes

- **ID:** 001-notes
- **Status:** shipped <!-- draft | clarified | planned | in-progress | shipped -->
- **Created:** 2026-08-30

> Constitution IV: this file says WHAT and WHY. No framework names, file paths,
> library choices or schemas — those belong in `plan.md`.

## Problem

Someone evaluating this repository has no way to tell whether the workflow
actually holds together. A README can claim that specs drive the code; only a
worked example can show it. Without one, the first real feature is also the first
time anyone finds out what `/specify → /plan → /tasks → /implement` feels like —
and the first time is the worst time to discover a gap.

## Outcome

The repository ships one small feature whose every user-visible behaviour is
written down here, mapped to a design in `plan.md`, broken down in `tasks.md`,
and named by an automated test. Someone can read this file, run
`pnpm spec:check`, and see the chain hold. Someone else can delete the feature in
one commit and keep the workflow.

## Out of scope

- Editing a note after it is created.
- Any server, account or sync. Notes live on one device, in one browser.
- Rich text, attachments, tags, folders, reminders.
- Sharing, export or import.
- Undo.

## User scenarios

### Scenario 1: capture a thought

- **Given** the notes page is open
- **When** the person types a title and submits
- **Then** the note appears at the top of the list and the form is empty again,
  ready for the next one

### Scenario 2: find it again tomorrow

- **Given** notes were added in an earlier session
- **When** the person reopens the page and types part of a note's text
- **Then** only the matching notes remain visible

### Scenario 3: keep what matters in sight

- **Given** a list long enough to scroll
- **When** the person pins a note
- **Then** it moves above every unpinned note and stays there across reloads

## Requirements

| ID     | Requirement                                                                                                                                                                             | Acceptance                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| FR-001 | The notes page lists every stored note.                                                                                                                                                 | With two notes stored, both are rendered.                                                                   |
| FR-002 | A search term shows only notes whose title or body contains it, ignoring case and surrounding whitespace. An empty term shows everything.                                               | `"SHOP"` matches a note titled `Shopping`; `"  milk  "` matches a body containing `milk`; `""` matches all. |
| FR-003 | A note requires a title of 1–80 characters after trimming; the body is optional and capped at 2000 characters. A rejected submission explains which field is wrong and creates nothing. | Submitting a blank title shows "Title is required" on the field and adds no note.                           |
| FR-004 | Pinned notes appear above unpinned ones. Within each group the most recently updated comes first, and equal timestamps break ties consistently.                                         | Pinning the older of two notes moves it to the top; re-sorting the same list twice yields the same order.   |
| FR-005 | Deleting a note asks for confirmation. Declining leaves the note untouched; accepting removes it permanently.                                                                           | Dismissing the prompt keeps the note; accepting it empties the list.                                        |
| FR-006 | Notes survive a page reload. Unreadable or malformed stored data is treated as "no notes" rather than an error.                                                                         | A note is still listed after reload; corrupt stored data yields an empty list and no crash.                 |
| FR-007 | An empty list explains why it is empty: nothing stored yet, versus nothing matching the current search.                                                                                 | With no notes: "No notes yet". With a non-matching search: "No notes match …".                              |
| FR-008 | The active search term is part of the page address, so it survives a reload and can be shared.                                                                                          | Typing a term updates the URL; reloading that URL keeps the list filtered.                                  |

## Edge cases

- **Whitespace-only title.** Trimmed first, so it is rejected by FR-003.
- **Title or body at the limit.** 80 and 2000 characters are accepted; one more is not.
- **Two notes created in the same millisecond.** FR-004's tie-break keeps the
  order stable rather than letting it flicker between renders.
- **Corrupt storage.** Hand-edited or half-written data must not brick the page (FR-006).
- **Storage unavailable or full.** The session keeps working; only durability is lost.
- **A search matching nothing.** Distinct from an empty store (FR-007).

## Non-functional constraints

- Everything runs on the device. No network call is made, so the page works offline.
- Storage is single-origin and unencrypted: this is for notes-to-self, not secrets.

## Open questions

None. All clarifications were resolved before planning.
