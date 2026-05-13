import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PipelineContext } from '../types.js'

vi.mock('@concert-crawl/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    }),
  },
  priceRetrievalLog: {},
  events: { id: 'id' },
}))

vi.mock('../tier1-structured-data.js', () => ({ tier1StructuredData: vi.fn() }))
vi.mock('../tier6-community.js', () => ({ tier6Community: vi.fn() }))

const { runPricePipeline } = await import('../index.js')
const { tier1StructuredData } = await import('../tier1-structured-data.js')
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
    expect(tier6Community).not.toHaveBeenCalled()
    const insertMock = vi.mocked(db.insert)
    expect(insertMock).toHaveBeenCalledWith(expect.anything())
    expect(vi.mocked(db.update)).toHaveBeenCalled()
  })

  it('logs a miss on tier 1 and continues to tier 6', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue(null)
    vi.mocked(tier6Community).mockResolvedValue({
      priceMin: 55,
      priceMax: null,
      source: 'community',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
    expect(vi.mocked(db.update)).toHaveBeenCalled()
  })

  it('logs an error on tier 1 and continues to tier 6', async () => {
    vi.mocked(tier1StructuredData).mockRejectedValue(
      new Error('network failure'),
    )
    vi.mocked(tier6Community).mockResolvedValue({
      priceMin: 30,
      priceMax: 60,
      source: 'community',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
  })

  it('stamps pipelineExhaustedAt when both tiers return null', async () => {
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
    // db.update always returns the same mock chain; retrieve set's call args
    // from the mock results without calling db.update again.
    const setMock = vi.mocked(db.update).mock.results[0]?.value?.set as
      | ReturnType<typeof vi.fn>
      | undefined
    const setCallArgs = (setMock?.mock?.calls ?? []).map(
      (callArgs: unknown[]) => callArgs[0],
    )
    const exhaustedCall = setCallArgs.find(
      (args: unknown) =>
        typeof args === 'object' &&
        args !== null &&
        'pipelineExhaustedAt' in args,
    )
    expect(exhaustedCall).toBeDefined()
  })

  it('does NOT stamp pipelineExhaustedAt when tier 1 hits', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue({
      priceMin: 25,
      priceMax: 50,
      source: 'structured_data',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).not.toHaveBeenCalled()
    const setMock = vi.mocked(db.update).mock.results[0]?.value?.set as
      | ReturnType<typeof vi.fn>
      | undefined
    const setCallArgs = (setMock?.mock?.calls ?? []).map(
      (callArgs: unknown[]) => callArgs[0],
    )
    const exhaustedCall = setCallArgs.find(
      (args: unknown) =>
        typeof args === 'object' &&
        args !== null &&
        'pipelineExhaustedAt' in args,
    )
    expect(exhaustedCall).toBeUndefined()
  })

  it('does NOT stamp pipelineExhaustedAt when tier 6 hits', async () => {
    vi.mocked(tier1StructuredData).mockResolvedValue(null)
    vi.mocked(tier6Community).mockResolvedValue({
      priceMin: 15,
      priceMax: null,
      source: 'community',
    })
    await runPricePipeline(ctx)
    expect(tier6Community).toHaveBeenCalledWith(ctx)
    const setMock = vi.mocked(db.update).mock.results[0]?.value?.set as
      | ReturnType<typeof vi.fn>
      | undefined
    const setCallArgs = (setMock?.mock?.calls ?? []).map(
      (callArgs: unknown[]) => callArgs[0],
    )
    const exhaustedCall = setCallArgs.find(
      (args: unknown) =>
        typeof args === 'object' &&
        args !== null &&
        'pipelineExhaustedAt' in args,
    )
    expect(exhaustedCall).toBeUndefined()
  })
})
