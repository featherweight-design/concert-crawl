import { describe, it, expect, vi } from 'vitest'
import {
  buildBatches,
  formatCsvRow,
  type EventForClassification,
  type ClassificationResult,
} from './2026-06-24-isconcert-review-needed-backfill-helpers.js'

describe('isconcert-review-needed-backfill — buildBatches', () => {
  it('splits events into batches of the configured size', () => {
    const events: EventForClassification[] = Array.from(
      { length: 53 },
      (_, idx) => ({
        id: `evt-${idx}`,
        title: `Show ${idx}`,
        artist: `Artist ${idx}`,
        description: null,
        date: '2026-08-01',
        venueName: 'Test Venue',
        currentHidden: true,
        currentReviewNeeded: false,
      }),
    )
    const batches = buildBatches(events, 25)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(25)
    expect(batches[1]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('isconcert-review-needed-backfill — formatCsvRow', () => {
  const baseResult: ClassificationResult = {
    eventId: 'abc-123',
    title: 'Borderline Show',
    artist: 'PRESIDENT',
    date: '2026-08-01',
    venueName: 'Test Venue',
    currentHiddenFromConsumer: true,
    llmIsConcert: true,
    llmReviewNeeded: true,
    action: 'disagrees-with-prior',
  }

  it('quotes fields containing commas', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show, with, commas' })
    expect(row).toContain('"Show, with, commas"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({ ...baseResult, title: 'Show "with" quotes' })
    expect(row).toContain('"Show ""with"" quotes"')
  })

  it('includes the action label in the trailing column', () => {
    const row = formatCsvRow({ ...baseResult, action: 'flag-for-review' })
    expect(row.trimEnd().endsWith(',flag-for-review')).toBe(true)
  })
})

// classifyBatch tests — mock the Anthropic SDK so we exercise response
// parsing without making real API calls. Pattern mirrors
// scripts/2026-06-19-non-concert-backfill.test.ts.

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
}))

const { classifyBatch } =
  await import('./2026-06-24-isconcert-review-needed-backfill.js')

const Anthropic = (await import('@anthropic-ai/sdk')).default

describe('isconcert-review-needed-backfill — classifyBatch', () => {
  it('parses isConcert + reviewNeeded out of the tool_use response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'classify_events',
          input: {
            classifications: [
              { eventId: 'evt-1', isConcert: true, reviewNeeded: true },
              { eventId: 'evt-2', isConcert: false, reviewNeeded: false },
            ],
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 30 },
    })
    const client = new Anthropic()
    const out = await classifyBatch(client, [
      {
        id: 'evt-1',
        title: 'PRESIDENT',
        artist: 'PRESIDENT',
        description: null,
        date: '2026-08-01',
        venueName: 'V',
        currentHidden: true,
        currentReviewNeeded: false,
      },
      {
        id: 'evt-2',
        title: 'Bingo',
        artist: 'Bingo',
        description: null,
        date: '2026-08-01',
        venueName: 'V',
        currentHidden: true,
        currentReviewNeeded: false,
      },
    ])
    expect(out).toEqual([
      { eventId: 'evt-1', isConcert: true, reviewNeeded: true },
      { eventId: 'evt-2', isConcert: false, reviewNeeded: false },
    ])
  })

  it('throws when the LLM returns no classify_events tool_use block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'no tool call' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const client = new Anthropic()
    await expect(
      classifyBatch(client, [
        {
          id: 'evt-1',
          title: 'X',
          artist: 'X',
          description: null,
          date: '2026-08-01',
          venueName: 'V',
          currentHidden: true,
          currentReviewNeeded: false,
        },
      ]),
    ).rejects.toThrow(/classify_events/)
  })

  it('rejects malformed classification entries', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'classify_events',
          input: {
            classifications: [{ eventId: 'evt-1', isConcert: 'yes' }],
          },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const client = new Anthropic()
    await expect(
      classifyBatch(client, [
        {
          id: 'evt-1',
          title: 'X',
          artist: 'X',
          description: null,
          date: '2026-08-01',
          venueName: 'V',
          currentHidden: true,
          currentReviewNeeded: false,
        },
      ]),
    ).rejects.toThrow(/wrong types|Malformed/)
  })
})
