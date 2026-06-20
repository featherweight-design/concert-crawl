import { describe, it, expect, vi } from 'vitest'
import {
  buildBatches,
  formatCsvRow,
  type EventForClassification,
} from './2026-06-19-non-concert-backfill-helpers.js'

describe('non-concert-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events = Array.from({ length: 53 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `Artist ${idx}`,
      description: null,
      date: '2026-08-01',
      venueName: 'Test Venue',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3) // 25 + 25 + 3
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns single batch when input fits in one batch', () => {
    const events = Array.from({ length: 10 }, (_, idx) => ({
      id: `evt-${idx}`,
      title: `Show ${idx}`,
      artist: `A`,
      description: null,
      date: '2026-08-01',
      venueName: 'V',
      currentHidden: false,
    }))
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(10)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('non-concert-backfill — formatCsvRow', () => {
  it('quotes fields containing commas', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show, with, commas',
      artist: 'Artist A',
      date: '2026-08-01',
      venueName: 'Venue Name',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show "with" quotes',
      artist: 'Artist',
      date: '2026-08-01',
      venueName: 'Venue',
      currentHidden: false,
      llmIsConcert: true,
      wouldChange: false,
    })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('marks wouldChange=true when currentHidden differs from llmIsConcert', () => {
    // currentHidden=false + llmIsConcert=false → would change (hide)
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Bingo Night',
      artist: 'BASS BINGO',
      date: '2026-08-01',
      venueName: 'Larimer',
      currentHidden: false,
      llmIsConcert: false,
      wouldChange: true,
    })
    expect(row).toContain(',true\n')
  })
})

// classifyBatch tests — mock the Anthropic SDK so we exercise the response
// parsing without making real API calls. Pattern mirrors
// packages/crawler-core/src/lib/extractors/llm.test.ts.

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
}))

// Dynamic import after vi.mock hoist so the mocked SDK is in scope when
// the script module's top-level imports run.
const { classifyBatch } = await import('./2026-06-19-non-concert-backfill.js')

function makeBatch(): EventForClassification[] {
  return [
    {
      id: 'evt-1',
      title: 'Test Show 1',
      artist: 'Artist 1',
      description: null,
      date: '2026-08-01',
      venueName: 'Venue 1',
      currentHidden: false,
    },
    {
      id: 'evt-2',
      title: 'Test Show 2',
      artist: 'Artist 2',
      description: 'A description',
      date: '2026-08-02',
      venueName: 'Venue 2',
      currentHidden: false,
    },
  ]
}

function makeToolResponse(input: unknown, toolName = 'classify_events') {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tool_abc',
        name: toolName,
        input,
      },
    ],
  }
}

describe('non-concert-backfill — classifyBatch', () => {
  it('returns parsed classifications on happy path', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({
        classifications: [
          { eventId: 'evt-1', isConcert: true },
          { eventId: 'evt-2', isConcert: false },
        ],
      }),
    )

    // The Anthropic constructor is mocked; passing any object satisfies
    // the type at runtime because the mock class accepts no args.
    const result = await classifyBatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (await import('@anthropic-ai/sdk')).default() as any,
      makeBatch(),
    )

    expect(result).toEqual([
      { eventId: 'evt-1', isConcert: true },
      { eventId: 'evt-2', isConcert: false },
    ])
  })

  it('throws when no tool_use block is returned', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'no tool use' }],
    })
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/classify_events tool_use block/)
  })

  it('throws when tool_use block name does not match (regression for unverified-tool-name)', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ classifications: [] }, 'some_other_tool'),
    )
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/classify_events tool_use block/)
  })

  it('throws when tool_use input is not an object', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse('not an object'))
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/tool_use input was not an object/)
  })

  it('throws when classifications field is not an array', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ classifications: 'not-an-array' }),
    )
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/classifications was not an array/)
  })

  it('throws when a classification entry is missing required fields', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({
        classifications: [{ eventId: 'evt-1' }], // missing isConcert
      }),
    )
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/Malformed classification entry/)
  })

  it('throws when a classification entry has wrong field types', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({
        classifications: [{ eventId: 123, isConcert: 'yes' }],
      }),
    )
    await expect(
      classifyBatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (await import('@anthropic-ai/sdk')).default() as any,
        makeBatch(),
      ),
    ).rejects.toThrow(/wrong types/)
  })
})
