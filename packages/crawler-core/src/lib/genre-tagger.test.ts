import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockLoggerWarn = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerInfo = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
}))

vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    warn: mockLoggerWarn,
    error: mockLoggerError,
    info: mockLoggerInfo,
  }),
}))

// Dynamic import after mock registration
const { classifyGenres, chunkArray, GENRE_TAG_BATCH_SIZE } =
  await import('./genre-tagger.js')

function makeToolResponse(
  results: { eventId: string; genres: string[] }[],
  usage = {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'tool_abc',
        name: 'tag_genres',
        input: { results },
      },
    ],
    usage,
  }
}

describe('classifyGenres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tagged results with token usage', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([
        {
          eventId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          genres: ['metal', 'rock'],
        },
      ]),
    )

    const { results, tokenUsage } = await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Metal Night',
        artist: 'Metallica',
      },
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.genres).toContain('metal')
    expect(results[0]?.genres).toContain('rock')
    expect(tokenUsage.inputTokens).toBe(100)
    expect(tokenUsage.outputTokens).toBe(50)
  })

  it('sends system prompt with cache_control ephemeral', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(Array.isArray(call.system)).toBe(true)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('uses claude-haiku-4-5-20251001 model', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })

  it('forces tag_genres tool choice', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'tag_genres' })
  })

  it('returns empty results when response has no tool_use block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'oops' }],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    })

    const { results } = await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    expect(results).toHaveLength(0)
  })

  it('maps cache token usage correctly', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([], {
        input_tokens: 200,
        output_tokens: 30,
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 8000,
      }),
    )

    const { tokenUsage } = await classifyGenres([])
    expect(tokenUsage.cacheReadTokens).toBe(5000)
    expect(tokenUsage.cacheWriteTokens).toBe(8000)
  })

  it('returns results when LLM assigns genres outside the original 8-value enum', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([
        {
          eventId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          genres: ['reggae'],
        },
      ]),
    )

    const { results } = await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Reggae Night',
        artist: 'Bob Marley',
      },
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.genres).toContain('reggae')
  })

  it('returns valid results and skips items whose genres array is empty', async () => {
    mockCreate.mockResolvedValue(
      makeToolResponse([
        {
          eventId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          genres: ['rock'],
        },
        {
          eventId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          genres: [],
        },
      ]),
    )

    const { results } = await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Rock Show',
        artist: 'AC/DC',
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        title: 'Mystery Show',
        artist: 'Unknown',
      },
    ])

    expect(results).toHaveLength(1)
    expect(results[0]?.eventId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  it('returns empty results when tool response is missing the results field', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_abc',
          name: 'tag_genres',
          input: {},
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    })

    const { results } = await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    expect(results).toHaveLength(0)
  })

  it('logs a warning when inputs were provided but no results were returned', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_abc',
          name: 'tag_genres',
          input: {},
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    })

    await classifyGenres([
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test',
        artist: 'Artist',
      },
    ])

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ inputCount: 1 }),
      expect.stringContaining('genre-tagger'),
    )
  })
})

describe('chunkArray', () => {
  it('splits an array into chunks of the given size', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7]
    expect(chunkArray(arr, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('returns the whole array as one chunk when smaller than chunk size', () => {
    const arr = [1, 2, 3]
    expect(chunkArray(arr, 50)).toEqual([[1, 2, 3]])
  })

  it('returns empty array for empty input', () => {
    expect(chunkArray([], 50)).toEqual([])
  })

  it('returns single-element chunks when size is 1', () => {
    expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  it('throws when size is zero', () => {
    expect(() => chunkArray([1, 2, 3], 0)).toThrow()
  })

  it('throws when size is negative', () => {
    expect(() => chunkArray([1, 2, 3], -1)).toThrow()
  })
})

describe('GENRE_TAG_BATCH_SIZE', () => {
  it('is 50', () => {
    expect(GENRE_TAG_BATCH_SIZE).toBe(50)
  })
})
