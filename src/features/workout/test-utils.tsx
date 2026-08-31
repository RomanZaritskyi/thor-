import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import type { ReactElement } from 'react'

import { renderApp, type RenderAppOptions } from '@/test/utils'

import { createWorkoutRepository, type WorkoutRepository } from './repository'
import { WorkoutRepositoryProvider } from './repository-provider'
import { createMemoryStore } from './store'
import type { WorkoutData } from './transfer'

export const TODAY = '2026-03-01'

/** A repository over memory, with deterministic ids and a clock pinned to TODAY. */
export function createTestRepository(
  seed: WorkoutData = { exercises: [], blocks: [], sets: [] },
  options: { unreadable?: string } = {},
): WorkoutRepository {
  let ids = 0
  let tick = 0

  return createWorkoutRepository({
    store: createMemoryStore(seed, options),
    createId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    now: () => new Date(2026, 2, 1, 10, 0, ++tick),
  })
}

/**
 * A router around the component under test. `Link` throws without one, and the
 * paths below must exist for links to resolve — so this doubles as a check that a
 * screen only links to routes the app actually has.
 */
function withRouter(ui: ReactElement, initialPath: string) {
  const rootRoute = createRootRoute()
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => ui }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/exercise/$exerciseId',
      component: () => ui,
    }),
    createRoute({ getParentRoute: () => rootRoute, path: '/history', component: () => ui }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/history/$exerciseId',
      component: () => ui,
    }),
    createRoute({ getParentRoute: () => rootRoute, path: '/data', component: () => ui }),
  ])

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  // The test tree is deliberately not the app's, so the registered types do not
  // describe it; the runtime shape is what matters here.
  return <RouterProvider router={router as never} />
}

/**
 * `renderApp` supplies the providers every feature needs; this adds the one this
 * feature injects, rather than teaching `src/test/` about workouts.
 */
export function renderWorkout(
  ui: ReactElement,
  {
    repository,
    initialPath = '/',
    ...options
  }: RenderAppOptions & { repository?: WorkoutRepository; initialPath?: string } = {},
) {
  const resolved = repository ?? createTestRepository()

  return {
    repository: resolved,
    ...renderApp(
      <WorkoutRepositoryProvider repository={resolved}>
        {withRouter(ui, initialPath)}
      </WorkoutRepositoryProvider>,
      options,
    ),
  }
}
