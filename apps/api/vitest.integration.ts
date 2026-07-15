import { defineConfig } from 'vitest/config'
import { resolveTestDbUrl } from './src/test/setup/test-db'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './src/test/setup/global-setup.ts',
    setupFiles: ['./src/test/setup/drain-background.ts'],
    include: ['**/*.integration.test.ts'],
    fileParallelism: false,
    forks: {
      singleFork: true,
    },
    env: {
      DATABASE_URL: resolveTestDbUrl(),
    },
  },
})
