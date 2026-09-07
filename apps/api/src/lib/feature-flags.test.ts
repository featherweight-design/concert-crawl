import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectRows = vi.fn()

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: () => ({ from: () => selectRows() }),
  },
  featureFlags: {},
}))

const { clearFeatureFlagCache, isFeatureEnabled, loadFeatureFlags } =
  await import('./feature-flags.js')

describe('loadFeatureFlags', () => {
  beforeEach(() => {
    clearFeatureFlagCache()
    selectRows.mockReset()
  })

  it('falls back to registry defaults when the table is empty', async () => {
    selectRows.mockResolvedValue([])
    await expect(loadFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('lets a stored row override its registry default', async () => {
    selectRows.mockResolvedValue([{ key: 'crews', enabled: true }])
    const flags = await loadFeatureFlags()
    expect(flags.crews).toBe(true)
    expect(flags['spotify-sync']).toBe(false)
  })

  it('ignores a stored row whose key left the registry', async () => {
    selectRows.mockResolvedValue([{ key: 'retired-thing', enabled: true }])
    const flags = await loadFeatureFlags()
    expect(Object.keys(flags).sort()).toEqual([
      'crews',
      'release-notes',
      'spotify-sync',
    ])
  })

  it('serves the memo rather than re-querying', async () => {
    selectRows.mockResolvedValue([])
    await loadFeatureFlags()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(1)
  })

  it('re-queries after the cache is cleared', async () => {
    selectRows.mockResolvedValue([])
    await loadFeatureFlags()
    clearFeatureFlagCache()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(2)
  })

  it('falls back to defaults when the query throws', async () => {
    selectRows.mockRejectedValue(new Error('connection refused'))
    await expect(loadFeatureFlags()).resolves.toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  // A failed read is cached like any other answer, so a database outage costs
  // one query and one log line per TTL window rather than one per request.
  it('memoizes the defaults it fell back to', async () => {
    selectRows.mockRejectedValue(new Error('connection refused'))
    await loadFeatureFlags()
    await loadFeatureFlags()
    expect(selectRows).toHaveBeenCalledTimes(1)
  })

  it('answers a single key', async () => {
    selectRows.mockResolvedValue([{ key: 'crews', enabled: true }])
    await expect(isFeatureEnabled('crews')).resolves.toBe(true)
  })
})
