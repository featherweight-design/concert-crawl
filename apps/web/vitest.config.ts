import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Seven suites assert against a real Next page by `await import`ing it —
    // `app/page.test.ts`, both `e/[id]` suites, the two admin/prices pages,
    // sign-up, and `events/[id]/metadata`. The first test in each pays the
    // whole module graph's compile cost: Clerk, the API client, and every
    // component the page mounts. That is inherent to testing the real page
    // rather than a mock of it, so it is a budget to size, not a bug to fix.
    //
    // Vitest's 5s default is too tight for it under contention. `pnpm test`
    // runs all eleven packages concurrently and CI shards this suite four
    // ways, and under that load `events/[id]/metadata` was observed timing
    // out at 5017ms while its two siblings — which reuse the now-warm module
    // — took 1320ms and 5ms. The result was an intermittent failure that
    // passed on every re-run and in isolation, which is the worst shape a
    // failure can have: it reads as noise, so a real regression in one of
    // these files would be dismissed as "that flake again".
    testTimeout: 15_000,
  },
})
