import { describe, expect, it, vi } from 'vitest'

// Swap the promise for a sentinel: a text array that hand-copies the line
// would keep printing the old words, which is how the two drifted (#1394).
vi.mock('../palette.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../palette.js')>()
  return {
    ...actual,
    PRICE_PROMISE: {
      premium: 'SENTINEL premium promise',
      supporter: 'SENTINEL supporter promise',
      founder: 'SENTINEL founder promise',
    },
  }
})

const { buildTestEmail } = await import('../test-fixtures.js')

describe('plain-text price promise', () => {
  it('follows PRICE_PROMISE in the welcome email', () => {
    expect(buildTestEmail('welcome_paid').text).toContain('SENTINEL')
  })
})
