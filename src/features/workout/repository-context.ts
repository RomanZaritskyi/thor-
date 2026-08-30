import { createContext, use } from 'react'

import type { WorkoutRepository } from './repository'

export const WorkoutRepositoryContext = createContext<WorkoutRepository | null>(null)

export function useWorkoutRepository(): WorkoutRepository {
  const repository = use(WorkoutRepositoryContext)

  if (repository === null) {
    throw new Error('useWorkoutRepository must be used inside <WorkoutRepositoryProvider>')
  }

  return repository
}
