/** The app's top-level sections, in the order the bar shows them. */
export type Section = 'exercises' | 'history' | 'data'

/**
 * FR-033 — which section a path belongs to. A function rather than the router's
 * `activeProps` because that cannot express "`/` but also `/exercise/x`": with an
 * exercise open, no tab would be lit, and the bar would be telling the user they
 * are nowhere.
 */
export function activeSection(pathname: string): Section | undefined {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (path === '/' || path === '/exercise' || path.startsWith('/exercise/')) return 'exercises'
  if (path === '/history' || path.startsWith('/history/')) return 'history'
  if (path === '/data') return 'data'

  return undefined
}
