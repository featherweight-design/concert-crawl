import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Integration test config — exercises crawlVenue against a real Postgres
// (the apps/api test DB at port 5433). Kept in a separate config from the
// default mocked Vitest run so CI doesn't accidentally pull in the test DB
// when running unit tests. Run via `pnpm --filter @concert-crawl/crawler-core
// test:integration`.
export default defineConfig({
  resolve: {
    alias: {
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
    include: ['**/*.integration.test.ts'],
    fileParallelism: false,
    forks: {
      singleFork: true,
    },
    globalSetup: './src/test/setup/global-setup.ts',
    env: {
      DATABASE_URL:
        process.env['DATABASE_URL_TEST'] ??
        'postgresql://postgres:postgres@localhost:5433/concert_crawl_test',
    },
  },
})
