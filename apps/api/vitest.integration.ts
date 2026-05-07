import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './src/test/setup/global-setup.ts',
    include: ['**/*.integration.test.ts'],
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL:
        process.env['DATABASE_URL_TEST'] ??
        'postgresql://postgres:postgres@localhost:5433/concert_crawl_test',
    },
  },
})
