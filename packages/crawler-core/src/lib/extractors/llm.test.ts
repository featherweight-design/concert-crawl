import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// import after mock registration
const { extractWithLlm } = await import('./llm.js')

const SOURCE_URL = 'https://example.com/events'

function makeAnthropicResponse(
  events: object[],
  usage = {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ events }) }],
    usage,
  }
}

describe('extractWithLlm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns extracted events with token usage', async () => {
    const mockEvents = [
      {
        title: 'Jazz Night',
        artist: 'Miles Davis Tribute',
        date: '2026-08-15',
        confidence: 0.95,
        sourceUrl: SOURCE_URL,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))

    const result = await extractWithLlm(
      '<html>Jazz Night event page</html>',
      SOURCE_URL,
    )

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.title).toBe('Jazz Night')
    expect(result.events[0]?.confidence).toBe(0.95)
    expect(result.usage.inputTokens).toBe(100)
    expect(result.usage.outputTokens).toBe(50)
  })

  it('sends a system prompt with cache_control ephemeral', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))

    await extractWithLlm('<html>test page</html>', SOURCE_URL)

    expect(mockCreate).toHaveBeenCalledOnce()
    const call = mockCreate.mock.calls[0]?.[0]
    // System prompt must be an array with cache_control on first block
    expect(Array.isArray(call.system)).toBe(true)
    const systemBlock = call.system[0]
    expect(systemBlock.cache_control).toEqual({ type: 'ephemeral' })
  })

  it('uses claude-haiku-4-5-20251001 model', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))

    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.model).toBe('claude-haiku-4-5-20251001')
  })

  it('returns empty events array on empty response', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))

    const result = await extractWithLlm(
      '<html>no events here</html>',
      SOURCE_URL,
    )
    expect(result.events).toHaveLength(0)
  })

  it('maps cache token usage correctly', async () => {
    mockCreate.mockResolvedValue(
      makeAnthropicResponse([], {
        input_tokens: 200,
        output_tokens: 30,
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 8000,
      }),
    )

    const result = await extractWithLlm('<html>cached page</html>', SOURCE_URL)
    expect(result.usage.cacheReadTokens).toBe(5000)
    expect(result.usage.cacheWriteTokens).toBe(8000)
  })
})
