import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  },
})
