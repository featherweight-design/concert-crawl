import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PipelineContext } from '../types.js'

vi.mock('@concert-crawl/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi
      .fn()
      .mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
  },
  priceRetrievalLog: {},
  events: { id: 'id' },
}))

vi.mock('../tier1-structured-data.js', () => ({ tier1StructuredData: vi.fn() }))
vi.mock('../tier2-ticketmaster.js', () => ({ tier2Ticketmaster: vi.fn() }))
vi.mock('../tier3-eventbrite-dice.js', () => ({
  tier3EventbriteDice: vi
    .fn()
    .mockResolvedValue({ eventbrite: null, dice: null }),
}))
vi.mock('../tier4-songkick-bandsintown.js', () => ({
  tier4SongkickBandsintown: vi
    .fn()
    .mockResolvedValue({ songkick: null, bandsintown: null }),
}))
vi.mock('../tier5-seatgeek.js', () => ({ tier5SeatGeek: vi.fn() }))
vi.mock('../tier6-community.js', () => ({ tier6Community: vi.fn() }))

const { runPricePipeline } = await import('../index.js')
const { tier1StructuredData } = await import('../tier1-structured-data.js')
const { tier2Ticketmaster } = await import('../tier2-ticketmaster.js')
const { tier3EventbriteDice } = await import('../tier3-eventbrite-dice.js')
const { tier5SeatGeek } = await import('../tier5-seatgeek.js')
const { tier6Community } = await import('../tier6-community.js')
const { db } = await import('@concert-crawl/db')

const ctx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
}

beforeEach(() => {
  vi.mocked(tier1StructuredData).mockResolvedValue(null)
  vi.mocked(tier2Ticketmaster).mockResolvedValue(null)
  vi.mocked(tier3EventbriteDice).mockResolvedValue({
    eventbrite: null,
    dice: null,
  })
  vi.mocked(tier5SeatGeek).mockResolvedValue(null)
  vi.mocked(tier6Community).mockResolvedValue(null)
})

afterEach(() => vi.clearAllMocks())

describe('runPricePipeline', () => {
  it('stops at tier 1 on first hit and updates event', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue({
      priceMin: 40,
      priceMax: 80,
      source: 'structured_data',
    })
    await runPricePipeline(ctx)
    expect(tier2Ticketmaster).not.toHaveBeenCalled()
    const insertMock = vi.mocked(db.insert)
    expect(insertMock).toHaveBeenCalledWith(expect.anything())
  })

  it('logs a miss and continues to next tier when tier returns null', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue(null)
    vi.mocked(tier2Ticketmaster).mockResolvedValue({
      priceMin: 55,
      priceMax: null,
      source: 'ticketmaster',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).not.toHaveBeenCalled()
  })

  it('logs an error and continues when tier throws', async () => {
    vi.mocked(tier1StructuredData).mockRejectedValue(
      new Error('network failure'),
    )
    vi.mocked(tier2Ticketmaster).mockResolvedValue({
      priceMin: 30,
      priceMax: 60,
      source: 'ticketmaster',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).not.toHaveBeenCalled()
  })

  it('reaches tier 6 when all previous tiers return null', async () => {
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
  })
})
