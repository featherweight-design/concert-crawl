import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Scripts live at the repo root and are not inside any workspace package.
// Resolve workspace deps via packages/crawler-core/node_modules which has
// @anthropic-ai/sdk, drizzle-orm, and @concert-crawl/* already installed.
const crawlerCoreModules = path.resolve(
  import.meta.dirname,
  'packages/crawler-core/node_modules',
)

export default defineConfig({
  resolve: {
    alias: {
      '@anthropic-ai/sdk': path.join(crawlerCoreModules, '@anthropic-ai/sdk'),
      'drizzle-orm': path.join(crawlerCoreModules, 'drizzle-orm'),
      '@concert-crawl/db': path.join(crawlerCoreModules, '@concert-crawl/db'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
})
