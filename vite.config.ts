import { fileURLToPath, URL } from 'node:url'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Must run before the React plugin so generated routes get transformed too.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react({ compiler: true }),
    tailwindcss(),
    // FR-011: the app must *open* with no network, which needs a precached
    // service worker. Disabled under test so Vitest and Playwright never race a
    // worker install.
    VitePWA({
      disable: process.env.VITEST === 'true',
      registerType: 'autoUpdate',
      // 'script' injects a plain navigator.serviceWorker.register(), which keeps
      // workbox-window out of the dependency list — we need registration, not a
      // programmatic update API.
      injectRegister: 'script',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        // Take control of the page that registered it. Without this the app only
        // becomes offline-capable on the *second* launch — which on a gym floor
        // is the launch that matters.
        clientsClaim: true,
      },
      manifest: {
        name: 'Thor — журнал тренувань',
        short_name: 'Thor',
        description: 'Що я робив у цій вправі минулого разу',
        lang: 'uk',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // e2e specs belong to Playwright, not Vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      // Thresholds guard logic, not wiring. Composition roots (entry point, route
      // modules, devtools, the QueryClient factory) and vendored shadcn source are
      // exercised by the Playwright suite instead.
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/test-utils.tsx',
        'src/routeTree.gen.ts',
        'src/main.tsx',
        'src/routes/**',
        'src/components/ui/**',
        'src/components/devtools.tsx',
        'src/lib/query-client.ts',
        'src/lib/pwa.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
