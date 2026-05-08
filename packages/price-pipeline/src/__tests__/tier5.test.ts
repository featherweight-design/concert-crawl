import { describe, it, expect, vi, afterEach } from 'vitest'
import { tier5SeatGeek } from '../tier5-seatgeek.js'
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

describe('tier5SeatGeek', () => {
  it('returns null when SEATGEEK_CLIENT_ID is not set', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', '')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns null when SEATGEEK_CLIENT_SECRET is not set', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', '')
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns null on non-200 response', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns null when fetch throws (e.g. timeout)', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AbortError')))
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns null when events array is empty', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ events: [] }),
      }),
    )
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns null when no event has a non-null lowest_price', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [
            { stats: { lowest_price: null, highest_price: null } },
            { stats: { lowest_price: null, highest_price: 80 } },
          ],
        }),
      }),
    )
    const result = await tier5SeatGeek(ctx)
    expect(result).toBeNull()
  })

  it('returns price from first event with lowest_price', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [{ stats: { lowest_price: 45, highest_price: 120 } }],
        }),
      }),
    )
    const result = await tier5SeatGeek(ctx)
    expect(result).toEqual({ priceMin: 45, priceMax: 120, source: 'seatgeek' })
  })

  it('returns priceMax null when highest_price is null', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [{ stats: { lowest_price: 30, highest_price: null } }],
        }),
      }),
    )
    const result = await tier5SeatGeek(ctx)
    expect(result).toEqual({ priceMin: 30, priceMax: null, source: 'seatgeek' })
  })

  it('skips events with null lowest_price and uses the next one', async () => {
    vi.stubEnv('SEATGEEK_CLIENT_ID', 'id')
    vi.stubEnv('SEATGEEK_CLIENT_SECRET', 'secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [
            { stats: { lowest_price: null, highest_price: null } },
            { stats: { lowest_price: 55, highest_price: 90 } },
          ],
        }),
      }),
    )
    const result = await tier5SeatGeek(ctx)
    expect(result).toEqual({ priceMin: 55, priceMax: 90, source: 'seatgeek' })
  })
})
