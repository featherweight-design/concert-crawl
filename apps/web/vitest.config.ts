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
    // A number of suites assert against a REAL module by `await import`ing it
    // rather than mocking its graph — Next pages, route handlers and layouts.
    // The first test in each pays that graph's whole compile cost: Clerk, the
    // API client, and every component the module mounts. That is inherent to
    // testing the real thing, so it is a budget to size rather than a bug to
    // fix; mocking the graph to make the import cheap would delete what those
    // suites exist to check.
    //
    // Deliberately not enumerated here. An exhaustive list rots the moment a
    // suite is added, and the previous version of this comment named seven
    // while missing at least `admin/events/[id]/edit/page.test.tsx`.
    //
    // Vitest's 5s default is too tight under contention: `pnpm test` runs all
    // eleven packages concurrently and CI shards this suite four ways. Under
    // that load `events/[id]/metadata` timed out at 5017ms while its two
    // siblings, reusing the now-warm module, took 1320ms and 5ms — 1662ms
    // cold on an idle machine, so roughly a 3x load factor. 15s carries that
    // with headroom while still failing a genuinely hung test promptly.
    //
    // `passport/[ratio]/__tests__/route.test.tsx` hit this first and solved it
    // locally with its own 30s constant for satori rasterisation. That one
    // stays: it is sized for a different and heavier cost, not for a cold
    // import.
    //
    // The failure shape is the real cost here. It passed on every re-run and
    // in isolation, so it read as noise — which means a genuine regression in
    // any of these suites would have been waved off as "that flake again".
    testTimeout: 15_000,
  },
})
