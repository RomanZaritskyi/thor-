import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { NoteDraft } from './model'
import { useNotesRepository } from './repository-context'

export const notesKeys = {
  all: ['notes'] as const,
  list: () => [...notesKeys.all, 'list'] as const,
}

export function useNotes() {
  const repository = useNotesRepository()

  return useQuery({
    queryKey: notesKeys.list(),
    queryFn: () => repository.list(),
  })
}

export function useCreateNote() {
  const repository = useNotesRepository()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: NoteDraft) => repository.create(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.list() }),
  })
}

export function useSetNotePinned() {
  const repository = useNotesRepository()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      repository.setPinned(id, pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.list() }),
  })
}

export function useDeleteNote() {
  const repository = useNotesRepository()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.list() }),
  })
}
