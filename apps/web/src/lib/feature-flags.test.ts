import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const get = vi.fn()
vi.mock('@/lib/api', () => ({ publicApiClient: { get } }))

const { getFeatureFlags, isFeatureEnabled } = await import('./feature-flags.js')

describe('server-side getFeatureFlags', () => {
  beforeEach(() => {
    get.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // Vitest is not configured to restore mocks, so the console spy has to be
  // torn down by hand or it stacks across tests and files.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the map the API gave it', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    })
    await expect(isFeatureEnabled('crews')).resolves.toBe(true)
  })

  it('falls back to registry defaults when the fetch throws', async () => {
    get.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(getFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('falls back when the API returns a malformed body', async () => {
    get.mockResolvedValue({ crews: 'yes' })
    await expect(isFeatureEnabled('crews')).resolves.toBe(false)
  })
})
