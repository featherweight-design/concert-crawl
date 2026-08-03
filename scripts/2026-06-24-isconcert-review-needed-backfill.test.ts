import { describe, it, expect, vi } from 'vitest'
import {
  buildBatches,
  classifyAction,
  formatCsvRow,
  neutralizeFormula,
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

  it('neutralizes leading = (CSV formula injection)', () => {
    const row = formatCsvRow({ ...baseResult, title: '=SUM(A1)' })
    // Prefixed with ' to neutralize, then needs quoting because = isn't
    // special but ' is just a literal char — the quoted/unquoted split is
    // driven by ,/"/\n. =SUM(A1) has no comma/quote/newline so it stays
    // unquoted, just neutralized.
    expect(row).toContain("'=SUM(A1)")
  })

  it('neutralizes leading + (CSV formula injection)', () => {
    const row = formatCsvRow({ ...baseResult, artist: '+CMD' })
    expect(row).toContain("'+CMD")
  })

  it('neutralizes leading - (CSV formula injection)', () => {
    const row = formatCsvRow({ ...baseResult, venueName: '-2+3' })
    expect(row).toContain("'-2+3")
  })

  it('neutralizes leading @ (CSV formula injection)', () => {
    const row = formatCsvRow({ ...baseResult, title: '@SUM(A1)' })
    expect(row).toContain("'@SUM(A1)")
  })

  it('leaves normal text untouched (no formula prefix)', () => {
    const row = formatCsvRow({ ...baseResult, title: 'PRESIDENT' })
    expect(row).toContain(',PRESIDENT,')
    // No leading single quote added
    expect(row).not.toContain("'PRESIDENT")
  })
})

describe('isconcert-review-needed-backfill — neutralizeFormula', () => {
  it('passes through empty string', () => {
    expect(neutralizeFormula('')).toBe('')
  })

  it('passes through strings starting with normal characters', () => {
    expect(neutralizeFormula('PRESIDENT')).toBe('PRESIDENT')
    expect(neutralizeFormula('123 Show')).toBe('123 Show')
    expect(neutralizeFormula(' leading space')).toBe(' leading space')
  })

  it('prefixes = + - @ with a single quote', () => {
    expect(neutralizeFormula('=foo')).toBe("'=foo")
    expect(neutralizeFormula('+foo')).toBe("'+foo")
    expect(neutralizeFormula('-foo')).toBe("'-foo")
    expect(neutralizeFormula('@foo')).toBe("'@foo")
  })
})

describe('isconcert-review-needed-backfill — classifyAction', () => {
  it('returns disagrees-with-prior when row is hidden AND llm now says concert', () => {
    expect(
      classifyAction({
        currentHidden: true,
        llmIsConcert: true,
        llmReviewNeeded: false,
      }),
    ).toBe('disagrees-with-prior')
  })

  it('disagrees-with-prior takes precedence over reviewNeeded', () => {
    // Both hidden+concert AND reviewNeeded=true — disagreement wins
    expect(
      classifyAction({
        currentHidden: true,
        llmIsConcert: true,
        llmReviewNeeded: true,
      }),
    ).toBe('disagrees-with-prior')
  })

  it('returns flag-for-review when not disagreement AND reviewNeeded=true', () => {
    // Hidden + non-concert + flagged (LLM still thinks non-concert but uncertain)
    expect(
      classifyAction({
        currentHidden: true,
        llmIsConcert: false,
        llmReviewNeeded: true,
      }),
    ).toBe('flag-for-review')
  })

  it('returns unflag when not disagreement AND reviewNeeded=false', () => {
    // Hidden + non-concert + unambiguous
    expect(
      classifyAction({
        currentHidden: true,
        llmIsConcert: false,
        llmReviewNeeded: false,
      }),
    ).toBe('unflag')
  })

  it('handles visible-and-flagged: returns flag-for-review (not disagreement, since not hidden)', () => {
    // Currently visible row that LLM thinks is concert AND borderline.
    // Backfill only loads hidden rows in production, but the helper
    // shouldn't assume that — defensive coverage for any future caller.
    expect(
      classifyAction({
        currentHidden: false,
        llmIsConcert: true,
        llmReviewNeeded: true,
      }),
    ).toBe('flag-for-review')
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

const { classifyBatch, classifyWithRetry } =
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

// classifyWithRetry tests — #807. Haiku sometimes omits an event from a
// batch response; the run used to abort. Cover both recovery stages.

const makeEvent = (id: string): EventForClassification => ({
  id,
  title: `Show ${id}`,
  artist: `Artist ${id}`,
  description: null,
  date: '2026-08-01',
  venueName: 'V',
  currentHidden: true,
  currentReviewNeeded: false,
})

const toolUseResponse = (ids: string[]) => ({
  content: [
    {
      type: 'tool_use',
      id: 'tool_1',
      name: 'classify_events',
      input: {
        classifications: ids.map((eventId) => ({
          eventId,
          isConcert: true,
          reviewNeeded: false,
        })),
      },
    },
  ],
  usage: { input_tokens: 10, output_tokens: 5 },
})

/** Event ids present in the prompt of the Nth mockCreate call. */
const promptedIds = (callIndex: number): string[] => {
  const call = mockCreate.mock.calls[callIndex]
  const content: unknown = call?.[0]?.messages?.[0]?.content
  if (typeof content !== 'string') return []
  return [...content.matchAll(/^- id: (\S+)$/gm)].map((match) => match[1] ?? '')
}

describe('isconcert-review-needed-backfill — classifyWithRetry', () => {
  it('returns first-pass results without retrying when nothing is dropped', async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValueOnce(toolUseResponse(['evt-1', 'evt-2']))
    const client = new Anthropic()
    const out = await classifyWithRetry(client, [
      makeEvent('evt-1'),
      makeEvent('evt-2'),
    ])
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(out.map((cls) => cls.eventId)).toEqual(['evt-1', 'evt-2'])
  })

  it('retries the batch with only the missing ids when one is dropped', async () => {
    mockCreate.mockReset()
    mockCreate
      .mockResolvedValueOnce(toolUseResponse(['evt-1', 'evt-3']))
      .mockResolvedValueOnce(toolUseResponse(['evt-2']))
    const client = new Anthropic()
    const out = await classifyWithRetry(client, [
      makeEvent('evt-1'),
      makeEvent('evt-2'),
      makeEvent('evt-3'),
    ])
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(promptedIds(1)).toEqual(['evt-2'])
    // Results come back in original batch order, not response order.
    expect(out.map((cls) => cls.eventId)).toEqual(['evt-1', 'evt-2', 'evt-3'])
  })

  it('falls back to per-event calls when the retry drops the same ids', async () => {
    mockCreate.mockReset()
    mockCreate
      .mockResolvedValueOnce(toolUseResponse(['evt-1']))
      .mockResolvedValueOnce(toolUseResponse([])) // retry drops both again
      .mockResolvedValueOnce(toolUseResponse(['evt-2']))
      .mockResolvedValueOnce(toolUseResponse(['evt-3']))
    const client = new Anthropic()
    const out = await classifyWithRetry(client, [
      makeEvent('evt-1'),
      makeEvent('evt-2'),
      makeEvent('evt-3'),
    ])
    expect(mockCreate).toHaveBeenCalledTimes(4)
    expect(promptedIds(1)).toEqual(['evt-2', 'evt-3'])
    expect(promptedIds(2)).toEqual(['evt-2'])
    expect(promptedIds(3)).toEqual(['evt-3'])
    expect(out.map((cls) => cls.eventId)).toEqual(['evt-1', 'evt-2', 'evt-3'])
  })

  it('omits an event that even per-event classification fails to return', async () => {
    mockCreate.mockReset()
    mockCreate
      .mockResolvedValueOnce(toolUseResponse(['evt-1']))
      .mockResolvedValueOnce(toolUseResponse([]))
      .mockResolvedValueOnce(toolUseResponse([]))
    const client = new Anthropic()
    const out = await classifyWithRetry(client, [
      makeEvent('evt-1'),
      makeEvent('evt-2'),
    ])
    // Caller (runBackfill) still throws `Classification missing` for evt-2.
    expect(out.map((cls) => cls.eventId)).toEqual(['evt-1'])
  })

  it('ignores ids the model returns that were not in the batch', async () => {
    mockCreate.mockReset()
    mockCreate
      .mockResolvedValueOnce(toolUseResponse(['evt-1', 'evt-hallucinated']))
      .mockResolvedValueOnce(toolUseResponse(['evt-2']))
    const client = new Anthropic()
    const out = await classifyWithRetry(client, [
      makeEvent('evt-1'),
      makeEvent('evt-2'),
    ])
    expect(promptedIds(1)).toEqual(['evt-2'])
    expect(out.map((cls) => cls.eventId)).toEqual(['evt-1', 'evt-2'])
  })
})
