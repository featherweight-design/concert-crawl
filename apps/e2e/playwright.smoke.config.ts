import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './src/fixtures/smoke-setup.ts',
  use: {
    baseURL:
      process.env['PLAYWRIGHT_SMOKE_BASE_URL'] ?? 'https://concertcrawl.app',
    storageState: '.auth/smoke.json',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 15_000,
  expect: { timeout: 5_000 },
})
