import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Vitest config for tests at the repo root (currently: scripts/**/*.test.ts).
//
// File is named `vitest.scripts.config.ts` (NOT `vitest.config.ts`) so it
// is NOT auto-discovered by workspace-package vitest invocations walking
// up the tree — otherwise their `vitest run` finds this root config,
// applies the `include: ['scripts/**/*.test.ts']` filter, finds no tests
// in their dir, and exits 1. Invoke explicitly via `pnpm test:scripts`.
//
// Workspace packages need explicit aliases to their src entry since the
// test file isn't inside any workspace. External deps (anthropic-sdk,
// drizzle-orm, etc.) resolve via pnpm's hoisted root node_modules — no
// alias required. Mirrors packages/crawler-core/vitest.config.ts pattern.

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@concert-crawl/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
})
