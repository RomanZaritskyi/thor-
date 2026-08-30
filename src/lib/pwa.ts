/**
 * Persistent storage is the difference between a training log and a training log
 * the browser may evict under pressure. Best effort, never guaranteed — which is
 * exactly why FR-017 and FR-018 exist.
 *
 * The service worker behind FR-011 is registered by vite-plugin-pwa itself
 * (`injectRegister: 'script'`), so there is nothing to do for it here.
 */
export function initPwa(): void {
  if (!import.meta.env.PROD) return

  try {
    // `navigator.storage` is typed as always present but is absent in insecure
    // contexts and older browsers, so this is a real guard, not defensive noise.
    void navigator.storage.persist().catch(() => undefined)
  } catch {
    // Nothing to do: the log still works, it is just evictable.
  }
}
