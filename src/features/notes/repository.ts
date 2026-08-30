import type { Note, NoteDraft } from './model'
import { createLocalStorageStore, createMemoryStore, type NotesStore } from './store'

export interface NotesRepository {
  list(): Promise<Note[]>
  create(draft: NoteDraft): Promise<Note>
  setPinned(id: string, pinned: boolean): Promise<Note>
  remove(id: string): Promise<void>
}

export interface NotesRepositoryDeps {
  store: NotesStore
  /** Injected so tests can pin time instead of racing the wall clock. */
  now?: () => Date
  /** Injected so tests can produce stable ids. */
  createId?: () => string
}

export class NoteNotFoundError extends Error {
  readonly id: string

  constructor(id: string) {
    super(`Note ${id} was not found`)
    this.name = 'NoteNotFoundError'
    this.id = id
  }
}

export function createNotesRepository({
  store,
  now = () => new Date(),
  createId = () => crypto.randomUUID(),
}: NotesRepositoryDeps): NotesRepository {
  function mutate(id: string, patch: (note: Note) => Note): Note {
    const notes = store.read()
    const index = notes.findIndex((note) => note.id === id)
    const current = notes[index]

    if (current === undefined) throw new NoteNotFoundError(id)

    const updated = patch(current)
    store.write(notes.with(index, updated))

    return updated
  }

  return {
    list: async () => store.read(),

    create: async (draft) => {
      const timestamp = now().toISOString()
      const note: Note = {
        id: createId(),
        title: draft.title,
        body: draft.body,
        pinned: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      store.write([...store.read(), note])

      return note
    },

    setPinned: async (id, pinned) =>
      mutate(id, (note) => ({ ...note, pinned, updatedAt: now().toISOString() })),

    remove: async (id) => {
      const notes = store.read()

      if (!notes.some((note) => note.id === id)) throw new NoteNotFoundError(id)

      store.write(notes.filter((note) => note.id !== id))
    },
  }
}

/** Production wiring: localStorage when available, memory when it is not (SSR, tests). */
export function createDefaultNotesRepository(): NotesRepository {
  const store =
    typeof window === 'undefined'
      ? createMemoryStore()
      : createLocalStorageStore(window.localStorage)

  return createNotesRepository({ store })
}
