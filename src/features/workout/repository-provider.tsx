import { useState, type ReactNode } from 'react'

import { createWorkoutRepository, type WorkoutRepository } from './repository'
import { WorkoutRepositoryContext } from './repository-context'
import { createIndexedDbStore } from './store'

export function WorkoutRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  /** Tests inject a repository; production falls back to IndexedDB. */
  repository?: WorkoutRepository
}) {
  // Lazy initial state: opening the database must not happen on every render.
  const [fallback] = useState(() => createWorkoutRepository({ store: createIndexedDbStore() }))

  return (
    <WorkoutRepositoryContext value={repository ?? fallback}>{children}</WorkoutRepositoryContext>
  )
}
