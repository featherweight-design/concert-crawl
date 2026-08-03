import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // Listed before the bare-specifier alias so the subpath wins — Vite
      // matches string aliases by prefix, and '@concert-crawl/db' would
      // otherwise rewrite this to <index.ts>/upcoming-events.
      '@concert-crawl/db/upcoming-events': path.resolve(
        __dirname,
        '../../packages/db/src/lib/upcoming-events.ts',
      ),
      '@concert-crawl/db': path.resolve(
        __dirname,
        '../../packages/db/src/index.ts',
      ),
      '@concert-crawl/logger': path.resolve(
        __dirname,
        '../../packages/logger/src/index.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
  },
})
