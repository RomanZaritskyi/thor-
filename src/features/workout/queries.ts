import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { SetDraft } from './model'
import { useWorkoutRepository } from './repository-context'
import type { WorkoutData } from './transfer'

export const workoutKeys = {
  all: ['workout'] as const,
  data: () => [...workoutKeys.all, 'data'] as const,
}

/**
 * One query for the whole log. At a few thousand sets this is a few hundred
 * kilobytes and keeps every rule a pure function over arrays; the port allows a
 * narrower read if that ever stops being true.
 */
export function useWorkoutData() {
  const repository = useWorkoutRepository()

  return useQuery({
    queryKey: workoutKeys.data(),
    queryFn: () => repository.load(),
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: workoutKeys.all })
}

export function useAddExercise() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (name: string) => repository.addExercise(name),
    onSuccess: invalidate,
  })
}

export function useRenameExercise() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => repository.renameExercise(id, name),
    onSuccess: invalidate,
  })
}

export function useRemoveExercise() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (id: string) => repository.removeExercise(id),
    onSuccess: invalidate,
  })
}

export function useRecordSet() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ exerciseId, draft }: { exerciseId: string; draft: SetDraft }) =>
      repository.recordSet(exerciseId, draft),
    onSuccess: invalidate,
  })
}

export function useFinishExercise() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (exerciseId: string) => repository.finishExercise(exerciseId),
    onSuccess: invalidate,
  })
}

export function useDeleteSet() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (id: string) => repository.deleteSet(id),
    onSuccess: invalidate,
  })
}

export function useReplaceAll() {
  const repository = useWorkoutRepository()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (data: WorkoutData) => repository.replaceAll(data),
    onSuccess: invalidate,
  })
}
