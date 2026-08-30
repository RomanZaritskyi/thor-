import { fileURLToPath, URL } from 'node:url'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Must run before the React plugin so generated routes get transformed too.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react({ compiler: true }),
    tailwindcss(),
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
        'src/routeTree.gen.ts',
        'src/main.tsx',
        'src/routes/**',
        'src/components/ui/**',
        'src/components/devtools.tsx',
        'src/lib/query-client.ts',
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
