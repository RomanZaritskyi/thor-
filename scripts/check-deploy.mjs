#!/usr/bin/env node
/**
 * Checks a deployed build from outside, over the network.
 *
 *   node scripts/check-deploy.mjs https://example.com
 *
 * These are the things a static host can get wrong without the first page load
 * looking any different — and each one breaks offline (FR-011) rather than
 * breaking the screen in front of you.
 *
 * Not part of `pnpm verify`: that gate must stay runnable with no network and no
 * deployment.
 */
const base = process.argv[2]?.replace(/\/+$/, '')

if (base === undefined || !/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/check-deploy.mjs <https://your-deployment>')
  process.exit(2)
}

const findings = []
const pass = (what) => {
  console.log(`  ok    ${what}`)
}
const fail = (what, detail) => {
  findings.push({ what, detail })
  console.log(`  FAIL  ${what}\n        ${detail}`)
}

async function get(path) {
  const response = await fetch(`${base}${path}`, { redirect: 'follow' })
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  }
}

console.log(`Checking ${base}\n`)

// 1. The app loads at all, and registers a service worker.
let indexBody = ''

try {
  const root = await get('/')
  indexBody = root.body

  if (root.status !== 200) {
    fail('the app responds at /', `expected 200, got ${String(root.status)}`)
  } else if (!root.body.includes('registerSW.js')) {
    fail(
      'the service worker is registered',
      'index.html does not reference registerSW.js — offline will silently never work',
    )
  } else {
    pass('the app responds at / and registers a service worker')
  }
} catch (error) {
  fail('the app responds at /', error instanceof Error ? error.message : String(error))
}

// 2. Deep links fall back to index.html rather than the host's 404.
try {
  const deep = await get('/exercise/does-not-exist')

  if (deep.status === 200 && deep.body.includes('<div id="root">')) {
    pass('a deep link falls back to the app (SPA rewrite)')
  } else {
    fail(
      'a deep link falls back to the app',
      `expected the app HTML, got ${String(deep.status)} — every shared or refreshed link will 404`,
    )
  }
} catch (error) {
  fail('a deep link falls back to the app', error instanceof Error ? error.message : String(error))
}

// 3. sw.js must never be served stale, or a new build can never take over.
try {
  const sw = await get('/sw.js')
  const cache = sw.headers.get('cache-control') ?? ''

  if (sw.status !== 200) {
    fail('sw.js is served', `expected 200, got ${String(sw.status)}`)
  } else if (/max-age=0|no-cache|no-store|must-revalidate/.test(cache)) {
    pass(`sw.js is not cached (${cache})`)
  } else {
    fail('sw.js is not cached', `Cache-Control is "${cache}" — users can be pinned to an old build`)
  }
} catch (error) {
  fail('sw.js is served', error instanceof Error ? error.message : String(error))
}

// 4. The manifest is what makes the app installable to a home screen.
try {
  const manifest = await get('/manifest.webmanifest')

  if (manifest.status === 200 && manifest.body.includes('"start_url"')) {
    pass('the web manifest is served')
  } else {
    fail(
      'the web manifest is served',
      `got ${String(manifest.status)} — the app cannot be installed`,
    )
  }
} catch (error) {
  fail('the web manifest is served', error instanceof Error ? error.message : String(error))
}

// 5. Hashed assets should be cached forever; the hash is what invalidates them.
const asset = /\/assets\/[^"']+\.js/.exec(indexBody)?.[0]

if (asset === undefined) {
  fail('a hashed asset is cached immutably', 'no /assets/*.js reference found in index.html')
} else {
  try {
    const response = await get(asset)
    const cache = response.headers.get('cache-control') ?? ''

    if (/immutable|max-age=\d{6,}/.test(cache)) {
      pass(`hashed assets are cached long (${cache})`)
    } else {
      fail('hashed assets are cached long', `Cache-Control on ${asset} is "${cache}"`)
    }
  } catch (error) {
    fail('hashed assets are cached long', error instanceof Error ? error.message : String(error))
  }
}

console.log(
  findings.length === 0
    ? '\nAll checks passed.\n\nOne thing this cannot check: whether the app opens with no signal.\nInstall it to your home screen, turn on airplane mode, launch from the icon,\nand record a set. That is FR-011.'
    : `\n${String(findings.length)} check(s) failed.`,
)

process.exit(findings.length > 0 ? 1 : 0)
