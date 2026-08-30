import { createContext, use } from 'react'

import type { NotesRepository } from './repository'

export const NotesRepositoryContext = createContext<NotesRepository | null>(null)

export function useNotesRepository(): NotesRepository {
  const repository = use(NotesRepositoryContext)

  if (repository === null) {
    throw new Error('useNotesRepository must be used inside <NotesRepositoryProvider>')
  }

  return repository
}
