import { useState, type ReactNode } from 'react'

import { createDefaultNotesRepository, type NotesRepository } from './repository'
import { NotesRepositoryContext } from './repository-context'

export function NotesRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  /** Tests and stories inject a repository; production falls back to localStorage. */
  repository?: NotesRepository
}) {
  // Lazy initial state: the default repository touches localStorage, so it must
  // not be reconstructed on every render.
  const [fallback] = useState(createDefaultNotesRepository)

  return <NotesRepositoryContext value={repository ?? fallback}>{children}</NotesRepositoryContext>
}
