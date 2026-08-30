import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { WorkoutRepositoryProvider } from '@/features/workout/repository-provider'
import { initPwa } from '@/lib/pwa'
import { queryClient } from '@/lib/query-client'
import '@/styles/globals.css'

import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

initPwa()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WorkoutRepositoryProvider>
        <RouterProvider router={router} />
      </WorkoutRepositoryProvider>
    </QueryClientProvider>
  </StrictMode>,
)
