import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Dynamic import after mock registration
const { classifyGenres } = await import('./genre-tagger.js')

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
      makeToolResponse([{ eventId: 'evt-uuid-1', genres: ['metal', 'rock'] }]),
    )

    const { results, tokenUsage } = await classifyGenres([
      { id: 'evt-uuid-1', title: 'Metal Night', artist: 'Metallica' },
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
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(Array.isArray(call.system)).toBe(true)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('uses claude-haiku-4-5-20251001 model', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
    ])

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })

  it('forces tag_genres tool choice', async () => {
    mockCreate.mockResolvedValue(makeToolResponse([]))

    await classifyGenres([
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
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
      { id: 'evt-uuid-1', title: 'Test', artist: 'Artist' },
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
})
