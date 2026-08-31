import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

import { BottomNav } from '@/components/bottom-nav'
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-8">
        {/* FR-012: nothing below this renders while the log is unreadable. */}
        <DataGuard>
          <Outlet />
        </DataGuard>
      </main>

      <Devtools />

      {/* FR-033. Last in flow so `sticky bottom-0` pins it to the viewport while
          the page scrolls beneath it. */}
      <BottomNav />
    </div>
  )
}

function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{ui.notFound.title}</h1>
      <p className="text-muted-foreground">{ui.notFound.body}</p>
      <Button asChild variant="outline">
        <Link to="/">{ui.notFound.back}</Link>
      </Button>
    </div>
  )
}
