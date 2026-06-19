import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockCreate }
    },
  ),
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
    content: [
      {
        type: 'tool_use',
        id: 'tool_abc123',
        name: 'save_events',
        input: { events },
      },
    ],
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

  it("prefixes user message with today's date in YYYY-MM-DD format", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))

    mockCreate.mockResolvedValue(makeAnthropicResponse([]))

    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const userMessage = call.messages[0]
    expect(userMessage.role).toBe('user')
    expect(userMessage.content).toMatch(/^Today's date: 2026-03-15\n/)

    vi.useRealTimers()
  })

  it('system prompt contains year-inference rule', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))

    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    expect(systemText).toContain('year')
    expect(systemText).toContain('current year')
  })

  it('drops empty-string doorsTime and showTime fields', async () => {
    const mockEvents = [
      {
        title: 'Late Show',
        artist: 'Night Owls',
        date: '2026-10-01',
        doorsTime: '',
        showTime: '',
        confidence: 0.88,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))

    const result = await extractWithLlm(
      '<html>late show page</html>',
      SOURCE_URL,
    )
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).not.toHaveProperty('doorsTime')
    expect(result.events[0]).not.toHaveProperty('showTime')
  })

  it('returns isConcert=true when the LLM emits it as true', async () => {
    const mockEvents = [
      {
        title: 'Miles Davis Tribute',
        artist: 'Miles Davis Tribute',
        date: '2026-08-15',
        confidence: 0.95,
        isConcert: true,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBe(true)
  })

  it('returns isConcert=false when the LLM emits it as false (non-concert event)', async () => {
    const mockEvents = [
      {
        title: 'BASS BINGO – Wooli Edition!',
        artist: 'Wooli',
        date: '2026-06-18',
        confidence: 0.9,
        isConcert: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBe(false)
  })

  it('defaults isConcert to undefined when the LLM omits the field (defensive parsing)', async () => {
    // Anthropic enforces required tool schema fields, but defending Zod
    // against the rare omission prevents one missing field from rejecting
    // the whole batch. Defaulting omission to "not set" lets the crawler
    // INSERT path treat it as concert (fail-open).
    const mockEvents = [
      {
        title: 'Open Mic Night',
        artist: 'Various',
        date: '2026-08-15',
        confidence: 0.7,
        // isConcert intentionally omitted
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.isConcert).toBeUndefined()
  })
})
