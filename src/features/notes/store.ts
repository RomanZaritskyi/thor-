import { notesSchema, type Note } from './model'

export const NOTES_STORAGE_KEY = 'thor.notes.v1'

/** Persistence port. Swap the adapter, keep every rule above it untouched. */
export interface NotesStore {
  read(): Note[]
  write(notes: readonly Note[]): void
}

export function createMemoryStore(seed: readonly Note[] = []): NotesStore {
  let notes: Note[] = [...seed]

  return {
    read: () => [...notes],
    write: (next) => {
      notes = [...next]
    },
  }
}

/**
 * FR-006 — notes survive a reload.
 *
 * Reads are fail-soft: unreadable, malformed or schema-invalid storage yields an
 * empty list instead of throwing, so a corrupted key can never brick the app.
 */
export function createLocalStorageStore(
  storage: Storage,
  key: string = NOTES_STORAGE_KEY,
): NotesStore {
  return {
    read: () => {
      let raw: string | null

      try {
        raw = storage.getItem(key)
      } catch {
        return []
      }

      if (raw === null) return []

      try {
        const parsed = notesSchema.safeParse(JSON.parse(raw))
        return parsed.success ? parsed.data : []
      } catch {
        return []
      }
    },
    write: (notes) => {
      try {
        storage.setItem(key, JSON.stringify(notes))
      } catch {
        // Quota exceeded or storage disabled: the in-session list stays correct,
        // only durability is lost. Surfacing this is FR-008 (not yet specified).
      }
    },
  }
}
