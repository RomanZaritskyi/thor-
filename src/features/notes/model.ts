import { z } from 'zod'

export const NOTE_TITLE_MAX = 80
export const NOTE_BODY_MAX = 2000

export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(NOTE_TITLE_MAX),
  body: z.string().max(NOTE_BODY_MAX),
  pinned: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const notesSchema = z.array(noteSchema)

export type Note = z.infer<typeof noteSchema>

/** What the user types. Trimmed and length-bounded before it ever reaches the store. */
export const noteDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(NOTE_TITLE_MAX, `Title must be ${NOTE_TITLE_MAX} characters or fewer`),
  body: z.string().trim().max(NOTE_BODY_MAX, `Body must be ${NOTE_BODY_MAX} characters or fewer`),
})

export type NoteDraft = z.infer<typeof noteDraftSchema>

/**
 * FR-002 — search matches title or body, case-insensitive, whitespace-insensitive
 * at the edges. An empty query matches everything.
 */
export function filterNotes(notes: readonly Note[], query: string): Note[] {
  const needle = query.trim().toLocaleLowerCase()

  if (needle === '') return [...notes]

  return notes.filter(
    (note) =>
      note.title.toLocaleLowerCase().includes(needle) ||
      note.body.toLocaleLowerCase().includes(needle),
  )
}

/**
 * FR-004 — pinned notes always sort above unpinned ones; inside a group the most
 * recently updated comes first. Ties break on `id` so the order is total and
 * deterministic (no render-to-render shuffling).
 */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1

    const byUpdated = Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    if (byUpdated !== 0) return byUpdated

    return a.id.localeCompare(b.id)
  })
}

/** The single ordering used by every notes view. */
export function selectVisibleNotes(notes: readonly Note[], query: string): Note[] {
  return sortNotes(filterNotes(notes, query))
}
