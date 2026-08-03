import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import {
  buildBatches,
  buildHeadlinerUpdate,
  formatCsvRow,
  isCoHeadlinerCandidate,
  untraceableHeadliners,
  type EventForHeadlinerCheck,
} from './2026-08-03-co-headliner-backfill-helpers.js'

describe('co-headliner-backfill — untraceableHeadliners', () => {
  it('accepts a promoted act that is a fragment of the stored artist string', () => {
    expect(
      untraceableHeadliners(
        'Desert Dwellers & Great Dane',
        [],
        ['Desert Dwellers & Great Dane', 'Great Dane'],
      ),
    ).toEqual([])
  })

  it('accepts a promoted act lifted out of supporting_artists', () => {
    expect(
      untraceableHeadliners(
        'Sleep Token',
        ['Sleep Theory'],
        ['Sleep Token', 'Sleep Theory'],
      ),
    ).toEqual([])
  })

  it('folds case and diacritics before comparing', () => {
    expect(
      untraceableHeadliners('Sigur Rós & Múm', [], ['Sigur Rós & Múm', 'mum']),
    ).toEqual([])
  })

  it('flags a name the model supplied from nowhere', () => {
    expect(
      untraceableHeadliners(
        'Desert Dwellers & Great Dane',
        ['Opener'],
        ['Desert Dwellers & Great Dane', 'Radiohead'],
      ),
    ).toEqual(['Radiohead'])
  })

  it('never flags position 0, which is the stored artist by construction', () => {
    expect(untraceableHeadliners('Iron & Wine', [], ['Iron & Wine'])).toEqual(
      [],
    )
  })
})

describe('co-headliner-backfill — isCoHeadlinerCandidate', () => {
  it('matches ampersand, plus, and standalone "and" bills', () => {
    expect(isCoHeadlinerCandidate('Desert Dwellers & Great Dane')).toBe(true)
    expect(isCoHeadlinerCandidate('Alpha + Beta')).toBe(true)
    expect(isCoHeadlinerCandidate('Alpha and Beta')).toBe(true)
    expect(isCoHeadlinerCandidate('ALPHA AND BETA')).toBe(true)
  })

  it('does not match "and" embedded in a word (word-boundary regression)', () => {
    expect(isCoHeadlinerCandidate('Portland')).toBe(false)
    expect(isCoHeadlinerCandidate('Sandy')).toBe(false)
    expect(isCoHeadlinerCandidate('The Portland Sandy Band')).toBe(false)
  })

  it('is a net, not a decision — real band names are candidates too', () => {
    // These MUST reach the LLM, which then reports a single headliner.
    expect(isCoHeadlinerCandidate('Iron & Wine')).toBe(true)
    expect(isCoHeadlinerCandidate('Hall & Oates')).toBe(true)
    expect(isCoHeadlinerCandidate('Florence + the Machine')).toBe(true)
    expect(isCoHeadlinerCandidate('Earth, Wind & Fire')).toBe(true)
  })
})

describe('co-headliner-backfill — buildBatches', () => {
  it('splits into batches of the configured size', () => {
    const items = Array.from({ length: 53 }, (_, idx) => idx)
    const batches = buildBatches(items, 25)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(25)
    expect(batches[2]).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(buildBatches([], 25)).toEqual([])
  })
})

describe('co-headliner-backfill — buildHeadlinerUpdate', () => {
  it('leaves an ampersand band name unchanged when the LLM returns one headliner', () => {
    const update = buildHeadlinerUpdate(
      'Iron & Wine',
      ['Iron & Wine'],
      ['Opener One'],
    )
    expect(update.headliners).toEqual(['Iron & Wine'])
    expect(update.wouldChange).toBe(false)
    expect(update.supportingArtists).toEqual(['Opener One'])
  })

  it('keeps the stored artist at position 0 even when the LLM re-spells it', () => {
    // Different diacritics AND different casing on the primary act.
    const update = buildHeadlinerUpdate(
      'Sigur Rós',
      ['sigur ros', 'Great Dane'],
      [],
    )
    expect(update.headliners[0]).toBe('Sigur Rós')
    // The LLM's re-spelling is dropped, not appended as a second act.
    expect(update.headliners).toEqual(['Sigur Rós', 'Great Dane'])
    expect(update.wouldChange).toBe(true)
  })

  it('promotes a genuine co-headliner and removes them from supporting_artists', () => {
    const update = buildHeadlinerUpdate(
      'Desert Dwellers',
      ['Desert Dwellers', 'Great Dane'],
      ['Great Dane', 'Real Opener'],
    )
    expect(update.headliners).toEqual(['Desert Dwellers', 'Great Dane'])
    expect(update.supportingArtists).toEqual(['Real Opener'])
  })

  it('removes a promoted co-headliner case-insensitively', () => {
    const update = buildHeadlinerUpdate(
      'Alpha',
      ['Alpha', 'Beta Band'],
      ['  beta band ', 'Real Opener'],
    )
    expect(update.supportingArtists).toEqual(['Real Opener'])
  })

  it('dedupes repeated headliners and drops empty entries', () => {
    const update = buildHeadlinerUpdate(
      'Alpha',
      ['Alpha', 'Beta', 'beta', '   '],
      null,
    )
    expect(update.headliners).toEqual(['Alpha', 'Beta'])
    expect(update.supportingArtists).toEqual([])
  })
})

describe('co-headliner-backfill — formatCsvRow', () => {
  it('quotes fields containing commas', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Earth, Wind & Fire, live',
      artist: 'Earth, Wind & Fire',
      date: '2026-08-01',
      venueName: 'Mission Ballroom',
      currentSupporting: null,
      proposedHeadliners: ['Earth, Wind & Fire'],
      proposedSupporting: [],
      wouldChange: false,
    })
    expect(row).toContain('"Earth, Wind & Fire, live"')
    expect(row).toContain('"Earth, Wind & Fire"')
  })

  it('escapes embedded double quotes by doubling them (RFC 4180)', () => {
    const row = formatCsvRow({
      eventId: 'abc-123',
      title: 'Show "with" quotes',
      artist: 'Alpha',
      date: '2026-08-01',
      venueName: 'Venue',
      currentSupporting: ['Opener'],
      proposedHeadliners: ['Alpha', 'Beta'],
      proposedSupporting: [],
      wouldChange: true,
    })
    expect(row).toContain('"Show ""with"" quotes"')
    expect(row).toContain(',true\n')
  })
})

// identifyHeadlinersBatch tests — mock the Anthropic SDK so we exercise the
// response parsing without making real API calls. Pattern mirrors
// scripts/2026-06-19-non-concert-backfill.test.ts.

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
}))

// Dynamic import after vi.mock hoist so the mocked SDK is in scope when the
// script module's top-level imports run.
const { identifyHeadlinersBatch } =
  await import('./2026-08-03-co-headliner-backfill.js')

function makeBatch(): EventForHeadlinerCheck[] {
  return [
    {
      id: 'evt-1',
      title: 'Iron & Wine',
      artist: 'Iron & Wine',
      supportingArtists: ['Opener One'],
      date: '2026-08-01',
      venueName: 'Ogden Theatre',
    },
    {
      id: 'evt-2',
      title: 'Desert Dwellers & Great Dane',
      artist: 'Desert Dwellers',
      supportingArtists: ['Great Dane'],
      date: '2026-08-02',
      venueName: 'Cervantes',
    },
  ]
}

function makeToolResponse(input: unknown, toolName = 'identify_headliners') {
  return {
    content: [{ type: 'tool_use', id: 'tool_abc', name: toolName, input }],
  }
}

async function makeClient(): Promise<Anthropic> {
  const AnthropicMock = (await import('@anthropic-ai/sdk')).default
  return new AnthropicMock({ apiKey: 'test-key' })
}

describe('co-headliner-backfill — identifyHeadlinersBatch', () => {
  it('returns parsed headliner lists on happy path', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({
        results: [
          { eventId: 'evt-1', headliners: ['Iron & Wine'] },
          {
            eventId: 'evt-2',
            headliners: ['Desert Dwellers', 'Great Dane'],
          },
        ],
      }),
    )
    const result = await identifyHeadlinersBatch(
      await makeClient(),
      makeBatch(),
    )
    expect(result).toEqual([
      { eventId: 'evt-1', headliners: ['Iron & Wine'] },
      { eventId: 'evt-2', headliners: ['Desert Dwellers', 'Great Dane'] },
    ])
  })

  it('throws when no tool_use block is returned', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'no tool use' }],
    })
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/identify_headliners tool_use block/)
  })

  it('throws when the tool_use block name does not match', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ results: [] }, 'some_other_tool'),
    )
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/identify_headliners tool_use block/)
  })

  it('throws when tool_use input is not an object', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse('not an object'))
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/tool_use input was not an object/)
  })

  it('throws when the results field is not an array', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ results: 'not-an-array' }),
    )
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/results was not an array/)
  })

  it('throws when an entry is missing required fields', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ results: [{ eventId: 'evt-1' }] }),
    )
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/Malformed headliner entry/)
  })

  it('throws when an entry has wrong field types', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ results: [{ eventId: 12, headliners: ['A'] }] }),
    )
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/wrong types/)
  })

  it('throws when headliners contains a non-string', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse({ results: [{ eventId: 'evt-1', headliners: [7] }] }),
    )
    await expect(
      identifyHeadlinersBatch(await makeClient(), makeBatch()),
    ).rejects.toThrow(/wrong types/)
  })
})
