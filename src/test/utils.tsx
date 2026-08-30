import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'

import type { Note } from '@/features/notes/model'
import { createNotesRepository, type NotesRepository } from '@/features/notes/repository'
import { NotesRepositoryProvider } from '@/features/notes/repository-provider'
import { createMemoryStore } from '@/features/notes/store'

/** Retries and background refetching make assertions flaky; both are off in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function buildNote(overrides: Partial<Note> = {}): Note {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    title: 'Note',
    body: '',
    pinned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * A repository backed by memory, with deterministic ids and a clock that ticks one
 * second per read — so "updatedAt moved forward" is assertable without fake timers.
 */
export function createTestRepository(seed: readonly Note[] = []): NotesRepository {
  let tick = 0
  let ids = 0

  return createNotesRepository({
    store: createMemoryStore(seed),
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++tick)),
    createId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
  })
}

export interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  repository?: NotesRepository
  queryClient?: QueryClient
}

export function renderApp(
  ui: ReactElement,
  { repository, queryClient = createTestQueryClient(), ...options }: RenderAppOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotesRepositoryProvider repository={repository ?? createTestRepository()}>
          {children}
        </NotesRepositoryProvider>
      </QueryClientProvider>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}
