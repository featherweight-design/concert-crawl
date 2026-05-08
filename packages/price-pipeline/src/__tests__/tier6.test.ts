import { describe, it, expect, vi, afterEach } from 'vitest'
import type { PipelineContext } from '../types.js'

// Mock @concert-crawl/db before importing the module under test
const mockLimit = vi.fn()

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: mockLimit }),
        }),
      }),
    }),
  },
  priceSubmissions: {
    priceMin: 'price_min',
    priceMax: 'price_max',
    eventId: 'event_id',
    status: 'status',
    createdAt: 'created_at',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
}))

const { tier6Community } = await import('../tier6-community.js')

const ctx: PipelineContext = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  artist: 'Test Artist',
  date: '2026-06-01',
}

afterEach(() => vi.clearAllMocks())

describe('tier6Community', () => {
  it('returns null when there are no corroborated submissions', async () => {
    mockLimit.mockResolvedValue([])
    const result = await tier6Community(ctx)
    expect(result).toBeNull()
  })

  it('returns the single submission price as the median', async () => {
    mockLimit.mockResolvedValue([{ priceMin: '40.00', priceMax: null }])
    const result = await tier6Community(ctx)
    expect(result).toEqual({
      priceMin: 40,
      priceMax: null,
      source: 'community',
    })
  })

  it('returns median of odd-count submissions', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: '30.00', priceMax: null },
      { priceMin: '50.00', priceMax: null },
      { priceMin: '40.00', priceMax: null },
    ])
    const result = await tier6Community(ctx)
    // sorted: [30, 40, 50] → median = 40
    expect(result?.priceMin).toBe(40)
  })

  it('returns average of two middle values for even-count submissions', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: '20.00', priceMax: null },
      { priceMin: '40.00', priceMax: null },
      { priceMin: '60.00', priceMax: null },
      { priceMin: '80.00', priceMax: null },
    ])
    const result = await tier6Community(ctx)
    // sorted: [20, 40, 60, 80] → median = (40 + 60) / 2 = 50
    expect(result?.priceMin).toBe(50)
  })

  it('filters out NaN priceMin values and uses valid ones', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: 'not-a-number', priceMax: null },
      { priceMin: '35.00', priceMax: null },
      { priceMin: '45.00', priceMax: null },
    ])
    const result = await tier6Community(ctx)
    // sorted valid: [35, 45] → median = (35 + 45) / 2 = 40
    expect(result?.priceMin).toBe(40)
  })

  it('returns null when all priceMin values are NaN', async () => {
    mockLimit.mockResolvedValue([{ priceMin: 'bad', priceMax: null }])
    const result = await tier6Community(ctx)
    expect(result).toBeNull()
  })

  it('returns priceMax null when no submissions have a priceMax', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: '30.00', priceMax: null },
      { priceMin: '50.00', priceMax: null },
    ])
    const result = await tier6Community(ctx)
    expect(result?.priceMax).toBeNull()
  })

  it('returns median priceMax when submissions have maxes', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: '30.00', priceMax: '60.00' },
      { priceMin: '40.00', priceMax: '80.00' },
      { priceMin: '50.00', priceMax: '100.00' },
    ])
    const result = await tier6Community(ctx)
    // sorted maxes: [60, 80, 100] → median = 80
    expect(result?.priceMax).toBe(80)
  })

  it('rounds priceMin to 2 decimal places', async () => {
    mockLimit.mockResolvedValue([
      { priceMin: '33.333', priceMax: null },
      { priceMin: '33.336', priceMax: null },
      { priceMin: '33.339', priceMax: null },
    ])
    const result = await tier6Community(ctx)
    // median = 33.336 → rounded to 33.34
    expect(result?.priceMin).toBe(33.34)
  })

  it('returns source community', async () => {
    mockLimit.mockResolvedValue([{ priceMin: '25.00', priceMax: null }])
    const result = await tier6Community(ctx)
    expect(result?.source).toBe('community')
  })
})
