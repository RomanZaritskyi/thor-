import { lazy, Suspense } from 'react'

/**
 * Devtools are dev-only: the dynamic imports live behind `import.meta.env.DEV`
 * so the production bundle never pulls them in.
 */
const RouterDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const mod = await import('@tanstack/react-router-devtools')
      return { default: mod.TanStackRouterDevtools }
    })
  : null

const QueryDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const mod = await import('@tanstack/react-query-devtools')
      return { default: mod.ReactQueryDevtools }
    })
  : null

export function Devtools() {
  if (!RouterDevtools || !QueryDevtools) return null

  return (
    <Suspense fallback={null}>
      <RouterDevtools position="bottom-right" />
      <QueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  )
}
