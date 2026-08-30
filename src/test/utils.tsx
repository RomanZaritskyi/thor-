import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'

/** Retries and background refetching make assertions flaky; both are off in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

/**
 * Renders with the providers every feature needs. A feature that injects its own
 * dependencies wraps this with its own provider rather than adding one here —
 * `src/test/` must not grow a dependency on any single feature.
 */
export function renderApp(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: RenderAppOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}
