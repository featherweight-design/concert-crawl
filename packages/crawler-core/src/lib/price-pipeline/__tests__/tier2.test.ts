import { describe, it, expect, vi, afterEach } from 'vitest'
import { tier2Ticketmaster } from '../tier2-ticketmaster.js'
import type { PipelineContext } from '../types.js'

const ctx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Radiohead',
  date: '2026-08-15',
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('tier2Ticketmaster', () => {
  it('returns null when TICKETMASTER_API_KEY is not set', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', '')
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })

  it('returns null on non-200 response', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })

  it('returns price from first event with priceRanges', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    const body = {
      _embedded: {
        events: [{ name: 'Radiohead', priceRanges: [{ min: 55, max: 120 }] }],
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
    )
    const result = await tier2Ticketmaster(ctx)
    expect(result).toEqual({
      priceMin: 55,
      priceMax: 120,
      source: 'ticketmaster',
    })
  })

  it('returns null when no events have priceRanges', async () => {
    vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
    const body = {
      _embedded: { events: [{ name: 'Radiohead', priceRanges: [] }] },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
    )
    const result = await tier2Ticketmaster(ctx)
    expect(result).toBeNull()
  })
})
