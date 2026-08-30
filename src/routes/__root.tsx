import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

import { Devtools } from '@/components/devtools'
import { Button } from '@/components/ui/button'
import { DataGuard } from '@/features/workout/components/data-guard'
import { ui } from '@/features/workout/strings'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 py-3">
          <Link to="/" search={{ q: '' }} className="font-semibold tracking-tight">
            {ui.appName}
          </Link>
          <Link
            to="/data"
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{ className: 'bg-accent text-accent-foreground' }}
          >
            {ui.transfer.title}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* FR-012: nothing below this renders while the log is unreadable. */}
        <DataGuard>
          <Outlet />
        </DataGuard>
      </main>

      <Devtools />
    </div>
  )
}

function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{ui.notFound.title}</h1>
      <p className="text-muted-foreground">{ui.notFound.body}</p>
      <Button asChild variant="outline">
        <Link to="/" search={{ q: '' }}>
          {ui.notFound.back}
        </Link>
      </Button>
    </div>
  )
}
