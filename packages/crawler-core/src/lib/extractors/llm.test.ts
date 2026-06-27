import { describe, it, expect, vi, beforeEach } from 'vitest'

// The crawler switched from `messages.create()` to `messages.stream()` to
// satisfy the SDK's "must stream when max_tokens could exceed 10 min" gate
// (see llm.ts). The mock pretends to stream but drives straight to a
// `finalMessage()` resolution — `mockCreate` records the params we'd
// otherwise inspect off `create()` and returns the response the existing
// tests configured via `.mockResolvedValue(...)`.
const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = {
        stream: (params: unknown) => ({
          finalMessage: async () => mockCreate(params),
        }),
      }
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
  stop_reason:
    | 'end_turn'
    | 'max_tokens'
    | 'tool_use'
    | 'stop_sequence' = 'tool_use',
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
    stop_reason,
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
        rawTitle: 'Jazz Night',
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

  it('system prompt names R&B ONLY LIVE as an explicit non-concert anti-example (#810)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)
    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    expect(systemText).toContain('R&B ONLY LIVE')
  })

  it('system prompt carves out recurring-residency dance nights as non-concerts (#810)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)
    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    // Editorial intent (Hugh): touring artists yes, recurring residencies no.
    expect(systemText).toContain('Swing Nights Lindy Jam')
    expect(systemText).toContain('recurring local-residency')
    expect(systemText).toContain(
      'touring artists, not weekly venue programming',
    )
  })

  it('system prompt contains the LIVE-in-brand-name rule with named-artist contrast (#810)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)
    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    expect(systemText).toContain('Wynonna Judd Live')
    expect(systemText).toMatch(/LIVE.+in-person experience/)
  })

  it('drops empty-string doorsTime and showTime fields', async () => {
    const mockEvents = [
      {
        title: 'Late Show',
        rawTitle: 'Late Show',
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
        rawTitle: 'Miles Davis Tribute',
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
        rawTitle: 'BASS BINGO – Wooli Edition!',
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
        rawTitle: 'Open Mic Night',
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

  it('returns reviewNeeded=true when the LLM emits it (borderline event)', async () => {
    const mockEvents = [
      {
        title: 'PRESIDENT: North American Campaign 2026',
        rawTitle: 'PRESIDENT: North American Campaign 2026',
        artist: 'PRESIDENT',
        date: '2026-08-15',
        confidence: 0.7,
        isConcert: false,
        reviewNeeded: true,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.reviewNeeded).toBe(true)
  })

  it('returns reviewNeeded=false when the LLM emits it (unambiguous event)', async () => {
    const mockEvents = [
      {
        title: 'Wynonna Judd Live',
        rawTitle: 'Wynonna Judd Live',
        artist: 'Wynonna Judd',
        date: '2026-08-15',
        confidence: 0.95,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.reviewNeeded).toBe(false)
  })

  it('defaults reviewNeeded to undefined when the LLM omits the field', async () => {
    const mockEvents = [
      {
        title: 'Open Mic',
        rawTitle: 'Open Mic',
        artist: 'Various',
        date: '2026-08-15',
        confidence: 0.6,
        isConcert: true,
        // reviewNeeded intentionally omitted
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.reviewNeeded).toBeUndefined()
  })

  it('SAVE_EVENTS_TOOL declares reviewNeeded as a required boolean property', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const tool = call.tools[0]
    expect(tool.name).toBe('save_events')
    const itemSchema = tool.input_schema.properties.events.items
    expect(itemSchema.properties.reviewNeeded).toEqual({
      type: 'boolean',
      description: expect.stringContaining('reasonable doubt'),
    })
    expect(itemSchema.required).toContain('reviewNeeded')
  })

  // rawTitle was added to plumb the unmodified source headline through to
  // the cross-venue presale filter — the LLM strips "AT MISSION BALLROOM"
  // when populating the cleaned `title`, dropping the marker the filter
  // needs. See issue #826.
  it('SAVE_EVENTS_TOOL declares rawTitle as a required string with a verbatim-copy description (#826)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const tool = call.tools[0]
    const itemSchema = tool.input_schema.properties.events.items
    expect(itemSchema.properties.rawTitle).toEqual({
      type: 'string',
      description: expect.stringContaining('verbatim'),
    })
    // The description must spell out the specific decoration the LLM
    // tends to drop, since "verbatim" alone hasn't been enough in past
    // crawls (Cervantes 2026-06-26 incident — see #826).
    expect(itemSchema.properties.rawTitle.description).toContain(
      'AT MISSION BALLROOM',
    )
    expect(itemSchema.required).toContain('rawTitle')
  })

  it('system prompt instructs the LLM to preserve the verbatim source headline in rawTitle (#826)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    expect(systemText).toContain('rawTitle')
    expect(systemText).toContain('verbatim')
    expect(systemText).toContain('AT MISSION BALLROOM')
  })

  it('returns rawTitle on extracted events when the LLM emits it (#826)', async () => {
    const mockEvents = [
      {
        title: 'AEG Presents Connor Price & Nic D',
        rawTitle: 'Connor Price & Nic D AT MISSION BALLROOM',
        artist: 'Connor Price & Nic D',
        date: '2026-08-15',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.rawTitle).toBe(
      'Connor Price & Nic D AT MISSION BALLROOM',
    )
    expect(result.events[0]?.title).toBe('AEG Presents Connor Price & Nic D')
  })

  it('rejects an LLM tool call that omits rawTitle (Zod required-field guard)', async () => {
    // Anthropic enforces required tool-schema fields, but the Zod check is
    // the defense-in-depth: if the model ever ships a malformed call (or
    // a future SDK change relaxes enforcement), we must reject the whole
    // batch rather than silently dropping rawTitle and breaking the
    // cross-venue filter on every subsequent row.
    const mockEvents = [
      {
        title: 'No rawTitle here',
        // rawTitle intentionally omitted
        artist: 'Nobody',
        date: '2026-08-15',
        confidence: 0.5,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(0)
  })

  it('system prompt instructs the LLM to set reviewNeeded for borderline cases', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const systemText: string = call.system[0].text
    expect(systemText).toContain('reviewNeeded')
    expect(systemText).toContain('ambiguous')
    expect(systemText).toContain('PRESIDENT')
  })

  // Output-budget regression guards. The Red Rocks went-dark incident on
  // 2026-06-25 was caused by the prior 16384-token cap clipping a 148-event
  // tool call mid-emit. These three tests lock in the new budget and the
  // truncation-detection log so a silent regression of this exact shape
  // cannot recur without an obvious test failure.

  it('requests at least 32K output tokens (Red Rocks 148-event regression guard)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.max_tokens).toBeGreaterThanOrEqual(32_000)
  })

  it('passes more than the legacy 50K char cap to the model (input-window regression guard)', async () => {
    // The pre-2026-06-25 cleanHtml cap of 50K chars was clipping the
    // event list on large venues before the model ever saw it; the
    // Red Rocks crawl that succeeded the day before only saw ~half of
    // the rendered grid. This guard locks the post-fix budget by feeding
    // 150K chars of synthetic text content and asserting that what
    // reaches the user message is substantially larger than the old cap.
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    // 150_000 'x' characters wrapped in a single span so the tag-strip
    // pass leaves the bulk of the content intact for the substring step.
    const bulkText = 'x'.repeat(150_000)
    const largeHtml = `<html><body><span>${bulkText}</span></body></html>`

    await extractWithLlm(largeHtml, SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const userContent: string = call.messages[0].content
    // The legacy 50K cap would have truncated bulkText. The new 200K cap
    // should let nearly all of it through; we assert "more than the old
    // cap" to keep the test stable against minor cleanHtml tweaks.
    const bulkInUserMsg = (userContent.match(/x/g) ?? []).length
    expect(bulkInUserMsg).toBeGreaterThan(50_000)
  })

  it("logs 'llm.output_truncated' when stop_reason is max_tokens", async () => {
    // reportFailure (severity='error') routes the structured JSON line
    // through console.error (stderr), so we spy there.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          [],
          {
            input_tokens: 50_000,
            output_tokens: 32_000,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          'max_tokens',
        ),
      )

      await extractWithLlm('<html>large venue page</html>', SOURCE_URL)

      const truncatedLog = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('llm.output_truncated'))
      expect(truncatedLog).toBeDefined()
      expect(truncatedLog).toContain('"outputTokens":32000')
    } finally {
      consoleSpy.mockRestore()
    }
  })

  // #851: BPM BINGO prod incident. Haiku occasionally duplicates a
  // trailing word in `title`. We strip it at the extractor boundary so
  // the malformed string never reaches the DB. rawTitle stays verbatim
  // because the cross-venue presale filter (#826) and the system-prompt
  // contract both depend on byte-for-byte source fidelity.
  it('cleans a duplicated trailing word from the extracted title (#851)', async () => {
    const mockEvents = [
      {
        title: 'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
        rawTitle: 'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
        artist: 'Dombresky / Walker & Royce',
        date: '2026-09-12',
        confidence: 0.85,
        isConcert: false,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))

    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.title).toBe(
      'BPM BINGO! Dombresky / Walker & Royce Edition',
    )
    // rawTitle MUST stay verbatim — see #826 cross-venue routing contract.
    expect(result.events[0]?.rawTitle).toBe(
      'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
    )
  })

  it("does NOT log 'llm.output_truncated' on a healthy tool_use stop", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      mockCreate.mockResolvedValue(makeAnthropicResponse([]))

      await extractWithLlm('<html>small page</html>', SOURCE_URL)

      const truncatedLog = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('llm.output_truncated'))
      expect(truncatedLog).toBeUndefined()
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
