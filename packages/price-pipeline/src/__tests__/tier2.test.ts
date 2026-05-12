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

  describe('keyword search date window', () => {
    it('uses Mountain Time date window (startDateTime T07:00:00Z, endDateTime next day T06:59:59Z)', async () => {
      vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _embedded: { events: [] } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await tier2Ticketmaster(ctx) // ctx.date = '2026-08-15'

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('startDateTime=2026-08-15T07%3A00%3A00Z')
      expect(calledUrl).toContain('endDateTime=2026-08-16T06%3A59%3A59Z')
    })
  })

  describe('event ID direct lookup', () => {
    it('calls /events/{id} endpoint when ticketUrl contains a TM event ID', async () => {
      vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ priceRanges: [{ min: 45, max: 90 }] }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await tier2Ticketmaster({
        ...ctx,
        ticketUrl:
          'https://www.ticketmaster.com/baby-keem-denver/event/1E006444E2718F46',
      })

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('/discovery/v2/events/1E006444E2718F46')
    })

    it('returns price from direct TM event lookup', async () => {
      vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ priceRanges: [{ min: 45, max: 90 }] }),
        }),
      )

      const result = await tier2Ticketmaster({
        ...ctx,
        ticketUrl:
          'https://www.ticketmaster.com/baby-keem-denver/event/1E006444E2718F46',
      })

      expect(result).toEqual({
        priceMin: 45,
        priceMax: 90,
        source: 'ticketmaster',
      })
    })

    it('falls back to keyword search when ticketUrl has no TM event ID', async () => {
      vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _embedded: { events: [] } }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await tier2Ticketmaster({
        ...ctx,
        ticketUrl: 'https://dice.fm/event/some-show',
      })

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('/discovery/v2/events.json')
    })

    it('returns null when direct TM lookup returns no priceRanges', async () => {
      vi.stubEnv('TICKETMASTER_API_KEY', 'test-key')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ priceRanges: [] }),
        }),
      )

      const result = await tier2Ticketmaster({
        ...ctx,
        ticketUrl: 'https://www.ticketmaster.com/some-show/event/ABC123',
      })

      expect(result).toBeNull()
    })
  })
})
