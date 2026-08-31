import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BottomNav } from './bottom-nav'

/**
 * The bar's own router. Every path it links to must exist here, so this doubles
 * as a check that the bar only points at addresses the app actually has.
 */
function renderAt(initialPath: string) {
  const rootRoute = createRootRoute({ component: BottomNav })
  const routeTree = rootRoute.addChildren(
    ['/', '/exercise/$exerciseId', '/history', '/history/$exerciseId', '/data'].map((path) =>
      createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
    ),
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  return render(<RouterProvider router={router as never} />)
}

const EXERCISE = '/exercise/11111111-1111-4111-8111-111111111111'

describe('<BottomNav /> (FR-033)', () => {
  it('offers every section of the app', async () => {
    renderAt('/')

    const bar = await screen.findByRole('navigation', { name: 'Розділи' })

    expect(Array.from(bar.querySelectorAll('a')).map((link) => link.textContent)).toEqual([
      'Вправи',
      'Історія',
      'Дані',
    ])
  })

  it('marks the section showing', async () => {
    renderAt('/history')

    expect(await screen.findByRole('link', { name: 'Історія' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Вправи' })).not.toHaveAttribute('aria-current')
  })

  it('marks the exercises section while an exercise is open, not none of them', async () => {
    // The whole reason `activeSection` exists rather than the router's own
    // active state: /exercise/x is the exercises section, and a bar with nothing
    // lit tells the user they are nowhere.
    renderAt(EXERCISE)

    expect(await screen.findByRole('link', { name: 'Вправи' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('lights nothing on an address the app does not have', async () => {
    renderAt('/data')
    const links = await screen.findAllByRole('link')

    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
  })
})
