import { Link, useRouterState } from '@tanstack/react-router'
import { Database, Dumbbell, History } from 'lucide-react'

import { ui } from '@/features/workout/strings'
import { activeSection } from '@/lib/nav'

/**
 * FR-033 — navigation at the bottom, where a thumb already is. It will take the
 * login tab without changing shape.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const current = activeSection(pathname)

  const link =
    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground aria-[current]:text-foreground'

  return (
    <nav
      aria-label={ui.nav.label}
      className="sticky bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-3xl">
        <li className="flex-1">
          <Link to="/" aria-current={current === 'exercises' ? 'page' : undefined} className={link}>
            <Dumbbell className="size-5" aria-hidden />
            {ui.nav.exercises}
          </Link>
        </li>
        <li className="flex-1">
          <Link
            to="/history"
            aria-current={current === 'history' ? 'page' : undefined}
            className={link}
          >
            <History className="size-5" aria-hidden />
            {ui.nav.history}
          </Link>
        </li>
        <li className="flex-1">
          <Link to="/data" aria-current={current === 'data' ? 'page' : undefined} className={link}>
            <Database className="size-5" aria-hidden />
            {ui.nav.data}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
