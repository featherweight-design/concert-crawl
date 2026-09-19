import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // `*.test.ts` only. Playwright specs are `*.spec.ts` and must never be
    // picked up by vitest — they need a browser.
    include: ['src/**/*.test.ts'],
  },
})
