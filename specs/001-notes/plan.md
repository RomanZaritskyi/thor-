# Plan: Notes

- **Spec:** `specs/001-notes/spec.md`
- **Status:** implemented

## Constitution check

| Principle                       | How this plan complies                                                                                          | Deviation + justification                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| V. Tests before code            | Ordering and validation rules get unit tests; each flow gets a component test; one Playwright pass per journey. | —                                                                                   |
| VI. Pure, framework-free domain | `model.ts` is plain functions over plain data. Storage, clock and id generation are injected interfaces.        | —                                                                                   |
| VII. Types and parsing          | Stored JSON and URL search params are parsed with a schema, never trusted.                                      | —                                                                                   |
| VIII. Accessibility             | Labelled inputs, accessible names on icon buttons, errors as `role="alert"` tied to their field.                | —                                                                                   |
| IX. Simplicity budget           | No new runtime dependency beyond what the starter already carries.                                              | The form component opts out of the React Compiler (`'use no memo'`); see **Risks**. |

## Approach

The feature splits into three layers that can each be wrong independently, so
each is tested independently. **Rules** (`model.ts`) are pure functions over
plain arrays — filtering and ordering have no idea storage exists. **Persistence**
sits behind a two-method `NotesStore` port with a localStorage adapter and a
memory adapter; the repository built on top exposes an async API even though
today's adapter is synchronous, so swapping in a server later changes one file
and no tests. **Presentation** reads through TanStack Query hooks that resolve
the repository from context, which is what lets component tests inject a memory
repository with a frozen clock and deterministic ids.

The alternative was the obvious one: call `localStorage` directly from the
component and sort inline. It is fewer lines today and it loses every property
worth having — the sort rule could not be tested without a DOM, "corrupt storage
is empty storage" could not be tested at all, and replacing the store would mean
rewriting the component. The indirection here is two small files and it buys all
of that back.

Search state lives in the URL rather than component state. That is what makes
FR-008 free: a reload restores the filter, and the address bar is shareable. The
cost is that the route owns the query and passes it down, so `NotesPage` takes
`query` and `onQueryChange` as props and stays router-agnostic — which is also
what makes it renderable in tests without a router.

## Data and contracts

- `Note` — `{ id, title, body, pinned, createdAt, updatedAt }`, ids are UUIDs and
  timestamps are ISO-8601 UTC strings. Validated by `noteSchema`.
- `NoteDraft` — `{ title, body }`, trimmed then length-checked by `noteDraftSchema`.
  This is the only shape the UI may hand to the repository.
- **Trust boundaries, both parsed:** the localStorage payload (`notesSchema`, with
  any failure collapsing to `[]` per FR-006) and the `?q=` search param (coerced
  to a string, defaulting to empty, so a hand-edited URL cannot throw — FR-008).

## Modules

| Path                                           | Responsibility                                      | New / changed |
| ---------------------------------------------- | --------------------------------------------------- | ------------- |
| `src/features/notes/model.ts`                  | schemas + pure filter/sort rules                    | new           |
| `src/features/notes/store.ts`                  | `NotesStore` port, localStorage and memory adapters | new           |
| `src/features/notes/repository.ts`             | CRUD over a store, injected clock and id generator  | new           |
| `src/features/notes/repository-context.ts`     | repository context + accessor hook                  | new           |
| `src/features/notes/repository-provider.tsx`   | provider, defaulting to localStorage                | new           |
| `src/features/notes/queries.ts`                | query keys and TanStack Query hooks                 | new           |
| `src/features/notes/components/note-form.tsx`  | validated creation form                             | new           |
| `src/features/notes/components/note-card.tsx`  | one note, with pin and delete affordances           | new           |
| `src/features/notes/components/notes-page.tsx` | composition, empty states                           | new           |
| `src/routes/notes/index.tsx`                   | route, `?q=` parsing, provider wiring               | new           |

## Requirement → design map

| FR     | Where it lives                                          | How it is proven                                                         |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| FR-001 | `queries.ts::useNotes` → `notes-page.tsx`               | component test renders every stored note                                 |
| FR-002 | `model.ts::filterNotes`                                 | unit tests for case, whitespace, no-match; component test                |
| FR-003 | `model.ts::noteDraftSchema` + `note-form.tsx`           | schema unit tests; component test asserts no write on invalid input      |
| FR-004 | `model.ts::sortNotes`; `repository.ts::setPinned`       | unit tests for grouping, recency, tie-break; component test for the move |
| FR-005 | `notes-page.tsx` confirmation + `repository.ts::remove` | component tests for both answers; e2e drives the real dialog             |
| FR-006 | `store.ts::createLocalStorageStore`                     | unit tests for malformed, invalid and throwing storage; e2e reload       |
| FR-007 | `notes-page.tsx` empty states                           | component tests for both empty states                                    |
| FR-008 | `routes/notes/index.tsx` `validateSearch`               | e2e asserts the URL and survives a reload                                |

## Complexity budget

- **No new runtime dependencies.** Everything uses what the starter already has.
- **`NotesStore` port (one interface, two adapters, ~40 lines).** Beats calling
  `localStorage` inline because it makes "corrupt data reads as empty" a unit
  test instead of a manual browser experiment.
- **Repository context.** Beats a module-level singleton because tests get
  isolation without resetting global state between cases.

## Risks

- **React Compiler vs. react-hook-form.** `register()` mutates form state during
  render, which is exactly what the compiler is allowed to memoise away; with it
  on, every submit after a `reset()` saw empty values. `note-form.tsx` carries
  `'use no memo'`. If the form ever starts silently dropping input, this is the
  first place to look.
- **localStorage is not a database.** Quota errors are swallowed, so a full
  store loses durability silently. Surfacing that is deliberately unspecified —
  it needs its own requirement before it gets an implementation.
