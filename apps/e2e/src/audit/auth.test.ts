import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @playwright/test before importing auth so chromium.launch() never
// actually spins up a browser in unit tests.
vi.mock('@playwright/test', () => ({
  chromium: {
    launch: vi.fn(),
  },
}))

import { loginAndSave } from '../fixtures/auth.js'

describe('loginAndSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('throws when email is empty', async () => {
    await expect(
      loginAndSave('', 'secret', '/tmp/state.json', 'http://localhost:3000'),
    ).rejects.toThrow('loginAndSave: email required')
  })

  it('throws when password is empty', async () => {
    await expect(
      loginAndSave(
        'user@example.com',
        '',
        '/tmp/state.json',
        'http://localhost:3000',
      ),
    ).rejects.toThrow('loginAndSave: password required')
  })

  it('throws when email is whitespace-only', async () => {
    // Regression guard: a stray-space env var previously drove the
    // browser and failed as a timeout deep in the Clerk flow. Trim
    // before the required-check so it fails fast.
    await expect(
      loginAndSave('   ', 'secret', '/tmp/state.json', 'http://localhost:3000'),
    ).rejects.toThrow('loginAndSave: email required')
  })

  it('throws when password is whitespace-only', async () => {
    await expect(
      loginAndSave(
        'user@example.com',
        '\t\n ',
        '/tmp/state.json',
        'http://localhost:3000',
      ),
    ).rejects.toThrow('loginAndSave: password required')
  })
})
