import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WatchingShow } from '@concert-crawl/types'

global.fetch = vi.fn()

const mockShow: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-abc',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
  savedAt: new Date().toISOString(),
  savedPrice: 45,
  currentPrice: 45,
  sourceKind: 'primary',
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: new Date().toISOString(),
  imageUrl: null,
}

describe('fetchWatching', () => {
  beforeEach(() => vi.mocked(fetch).mockReset())

  it('fetches /v1/watching with the provided Bearer token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [mockShow] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { fetchWatching } = await import('./watching.js')
    const result = await fetchWatching('my-token')

    expect(result).toEqual([mockShow])

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/v1/watching')
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-token',
    )
  })

  it('returns an array of WatchingShow objects with eventId for Set construction', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            mockShow,
            { ...mockShow, eventId: 'ev-xyz', userEventId: 'ue-2' },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const { fetchWatching } = await import('./watching.js')
    const shows = await fetchWatching('token')

    const watchedIds = new Set(shows.map((show) => show.eventId))
    expect(watchedIds.has('ev-abc')).toBe(true)
    expect(watchedIds.has('ev-xyz')).toBe(true)
    expect(watchedIds.has('ev-missing')).toBe(false)
  })
})
