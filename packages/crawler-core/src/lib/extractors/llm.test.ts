import { describe, it, expect, vi, beforeEach } from 'vitest'

// The crawler switched from `messages.create()` to `messages.stream()` to
// satisfy the SDK's "must stream when max_tokens could exceed 10 min" gate
// (see llm.ts). The mock pretends to stream but drives straight to a
// `finalMessage()` resolution — `mockCreate` records the params we'd
// otherwise inspect off `create()` and returns the response the existing
// tests configured via `.mockResolvedValue(...)`.
const mockCreate = vi.fn()
// `adjudicateEvent` calls `messages.create()` directly — one listing fits well
// inside the token budget that forces page extraction to stream.
const mockAdjudicate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = {
        stream: (params: unknown) => ({
          finalMessage: async () => mockCreate(params),
        }),
        create: (params: unknown) => mockAdjudicate(params),
      }
    },
  ),
}))

// import after mock registration
const { extractWithLlm, adjudicateEvent } = await import('./llm.js')

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
    'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence' = 'tool_use',
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

  it('threads supportingArtists and tourName through the return object (#643)', async () => {
    const mockEvents = [
      {
        title: 'Wednesday',
        rawTitle: 'Wednesday',
        artist: 'Wednesday',
        supportingArtists: ['Hotline TNT', 'MJ Lenderman'],
        tourName: 'Rat Saw God Tour',
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.supportingArtists).toEqual([
      'Hotline TNT',
      'MJ Lenderman',
    ])
    expect(result.events[0]?.tourName).toBe('Rat Saw God Tour')
  })

  it('trims and drops blank supportingArtists / whitespace tourName (#643)', async () => {
    const mockEvents = [
      {
        title: 'Wednesday',
        rawTitle: 'Wednesday',
        artist: 'Wednesday',
        supportingArtists: ['  Hotline TNT  ', '   ', ''],
        tourName: '   ',
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events[0]?.supportingArtists).toEqual(['Hotline TNT'])
    expect(result.events[0]?.tourName).toBeUndefined()
  })

  it('drops openers that repeat the headliner, case-insensitively (#643)', async () => {
    const mockEvents = [
      {
        title: 'The Body',
        rawTitle: 'The Body',
        artist: 'The Body',
        supportingArtists: ['the body', 'Big Brave', 'Many Blessings'],
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events[0]?.supportingArtists).toEqual([
      'Big Brave',
      'Many Blessings',
    ])
  })

  it('defaults headliners to [artist] when the LLM omits it (#1203)', async () => {
    const mockEvents = [
      {
        title: 'Iron & Wine',
        rawTitle: 'Iron & Wine',
        artist: 'Iron & Wine',
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    // One act, ampersand and all — nothing splits on punctuation.
    expect(result.events[0]?.headliners).toEqual(['Iron & Wine'])
  })

  it('threads a co-headline set through with artist first (#1203)', async () => {
    const mockEvents = [
      {
        title: 'Desert Dwellers & Great Dane',
        rawTitle: 'Desert Dwellers & Great Dane',
        artist: 'Desert Dwellers',
        headliners: ['Desert Dwellers', 'Great Dane'],
        supportingArtists: ['Numatik'],
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events[0]?.headliners).toEqual([
      'Desert Dwellers',
      'Great Dane',
    ])
    expect(result.events[0]?.supportingArtists).toEqual(['Numatik'])
  })

  it('forces artist into headliners[0] and drops blanks / repeats (#1203)', async () => {
    const mockEvents = [
      {
        title: 'Great Dane & Desert Dwellers',
        rawTitle: 'Great Dane & Desert Dwellers',
        artist: 'Desert Dwellers',
        // Model led with the wrong act, repeated the artist in another case,
        // and padded the list with blanks.
        headliners: ['Great Dane', '  ', 'desert dwellers', 'Great Dane'],
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events[0]?.headliners).toEqual([
      'Desert Dwellers',
      'Great Dane',
    ])
  })

  it('keeps headliners and supportingArtists disjoint (#1203)', async () => {
    const mockEvents = [
      {
        title: 'Desert Dwellers + Great Dane',
        rawTitle: 'Desert Dwellers + Great Dane',
        artist: 'Desert Dwellers',
        // The model read the bill both ways — co-headline AND opener.
        headliners: ['Desert Dwellers', 'Great Dane'],
        supportingArtists: ['Great Dane', 'Bluetech'],
        date: '2026-08-01',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))
    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)
    expect(result.events[0]?.headliners).toEqual([
      'Desert Dwellers',
      'Great Dane',
    ])
    expect(result.events[0]?.supportingArtists).toEqual(['Bluetech'])
  })

  it('SAVE_EVENTS_TOOL declares headliners with a no-punctuation-split rule (#1203)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    const itemSchema = call.tools[0].input_schema.properties.events.items
    expect(itemSchema.properties.headliners.type).toBe('array')
    expect(itemSchema.properties.headliners.description).toContain(
      'Iron & Wine',
    )
    // Optional by design: an omitted list falls back to [artist].
    expect(itemSchema.required).not.toContain('headliners')
  })

  it('system prompt keeps ampersand-containing band names as one headliner (#1203)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const systemPrompt = mockCreate.mock.calls[0]?.[0].system[0].text
    expect(systemPrompt).toContain('headliners[0] MUST be exactly the same')
    expect(systemPrompt).toContain('Coheed and Cambria')
    expect(systemPrompt).toContain('for KING + COUNTRY')
  })

  it('system prompt pins series-branded artists to the brand (#676)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const systemPrompt = mockCreate.mock.calls[0]?.[0].system[0].text
    expect(systemPrompt).toContain('Recurring series brands')
    expect(systemPrompt).toContain('artist is the SERIES BRAND alone')
    expect(systemPrompt).toContain('BASS BINGO – Wooli Edition')
    // The rule must not leak into classification: a DJ-driven brand stays a
    // non-concert even though it now yields a stable artist string.
    expect(systemPrompt).toContain('applies to the artist field only')
    // The brand rule and the null-artist rule both claim bingo and screening
    // nights, so the prompt has to say which one wins in each direction.
    expect(systemPrompt).toContain('takes precedence here')
    expect(systemPrompt).toContain('overrides the null-artist rule above')

    // The tool schema restates the null rule, so it has to carry the same
    // exception or the two halves of the request contradict each other.
    const itemSchema =
      mockCreate.mock.calls[0]?.[0].tools[0].input_schema.properties.events
        .items
    expect(itemSchema.properties.artist.description).toContain('EXCEPTION')
    expect(itemSchema.properties.artist.description).toContain(
      'recurring series brand',
    )
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

  it('requests at least 64K output tokens (Red Rocks 148-event and Cervantes truncation guards)', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse([]))
    await extractWithLlm('<html>test</html>', SOURCE_URL)

    const call = mockCreate.mock.calls[0]?.[0]
    expect(call.max_tokens).toBeGreaterThanOrEqual(64_000)
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

  describe('per-event URLs', () => {
    const EVENT_HTML = `<html><body>
      <a href="/events/griz-1489047/"><h3>GRiZ</h3></a>
      <a href="https://www.axs.com/events/1489047/griz-tickets?skin=redrocks">Buy Tickets</a>
    </body></html>`

    function grizRow(overrides: object) {
      return {
        title: 'GRiZ',
        rawTitle: 'GRiZ',
        artist: 'GRiZ',
        date: '2026-09-12',
        confidence: 0.95,
        ...overrides,
      }
    }

    it('shows the model each link as a marker before its text', async () => {
      mockCreate.mockResolvedValue(makeAnthropicResponse([]))

      await extractWithLlm(EVENT_HTML, SOURCE_URL)

      const userContent: string =
        mockCreate.mock.calls[0]?.[0].messages[0].content
      expect(userContent).toContain(
        '[link: https://example.com/events/griz-1489047/] GRiZ',
      )
    })

    it('keeps an eventUrl the page actually linked to', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse([
          grizRow({ eventUrl: 'https://example.com/events/griz-1489047/' }),
        ]),
      )

      const result = await extractWithLlm(EVENT_HTML, SOURCE_URL)

      expect(result.events[0]?.eventUrl).toBe(
        'https://example.com/events/griz-1489047/',
      )
    })

    it('keeps a ticketUrl the page actually linked to', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse([
          grizRow({
            ticketUrl:
              'https://www.axs.com/events/1489047/griz-tickets?skin=redrocks',
          }),
        ]),
      )

      const result = await extractWithLlm(EVENT_HTML, SOURCE_URL)

      expect(result.events[0]?.ticketUrl).toBe(
        'https://www.axs.com/events/1489047/griz-tickets?skin=redrocks',
      )
    })

    it('drops a hallucinated URL the page never linked to', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse([
          grizRow({
            eventUrl: 'https://example.com/events/griz-tickets-2026/',
            ticketUrl: 'https://www.axs.com/events/9999999/griz/',
          }),
        ]),
      )

      const result = await extractWithLlm(EVENT_HTML, SOURCE_URL)

      expect(result.events[0]?.eventUrl).toBeUndefined()
      expect(result.events[0]?.ticketUrl).toBeUndefined()
    })

    it('omits both URLs when the model returns none', async () => {
      mockCreate.mockResolvedValue(makeAnthropicResponse([grizRow({})]))

      const result = await extractWithLlm(EVENT_HTML, SOURCE_URL)

      expect(result.events[0]?.eventUrl).toBeUndefined()
      expect(result.events[0]?.ticketUrl).toBeUndefined()
    })
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
      expect(truncatedLog).toContain('"outputUsed":32000')
      expect(truncatedLog).toContain('"outputBudget":64000')
      // Sentry scrubs any extra whose key contains 'token', so a report
      // that names one arrives on the issue page with a null value.
      const reportKeys = Object.keys(JSON.parse(truncatedLog ?? '{}'))
      expect(reportKeys.filter((key) => /token/i.test(key))).toEqual([])
    } finally {
      consoleSpy.mockRestore()
    }
  })

  // #851: BPM BINGO prod incident. Haiku occasionally duplicates a
  // trailing word in `title`. We strip it at the extractor boundary so
  // the malformed string never reaches the DB. rawTitle stays verbatim
  // because the cross-venue presale filter (#826) and the system-prompt
  // contract both depend on byte-for-byte source fidelity — and (#863)
  // it doubles as the cross-check ground truth: the glitch shape is
  // title duplicated while rawTitle stays clean.
  it('cleans a duplicated trailing word from the extracted title (#851)', async () => {
    const mockEvents = [
      {
        title: 'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
        rawTitle: 'BPM BINGO! Dombresky / Walker & Royce Edition',
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
      'BPM BINGO! Dombresky / Walker & Royce Edition',
    )
  })

  // #863: Bow Wow Wow false positive. A legitimate title can genuinely
  // end in a repeated word — rawTitle is byte-for-byte from the source
  // page, so when the doubled pair appears there too, the repeat is real
  // and the extractor must NOT strip it.
  it('keeps a trailing repeat confirmed by rawTitle (#863)', async () => {
    const billTitle =
      'Thomas Dolby & The Lost Toy People, A Flock of Seagulls Bow Wow Wow'
    const mockEvents = [
      {
        title: billTitle,
        rawTitle: billTitle,
        artist: 'Thomas Dolby',
        date: '2026-10-03',
        confidence: 0.9,
        isConcert: true,
        reviewNeeded: false,
      },
    ]
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockEvents))

    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.title).toBe(billTitle)
    expect(result.events[0]?.rawTitle).toBe(billTitle)
  })

  it('keeps valid events when a sibling row fails validation', async () => {
    // Dropped-row reports are severity 'warn', which reportFailure routes to
    // console.warn rather than console.error.
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse([
          {
            title: 'Good Show',
            rawTitle: 'Good Show',
            artist: 'Real Band',
            date: '2026-09-01',
            confidence: 0.9,
          },
          // `date` is a number — unparseable, and previously enough to
          // discard the whole page.
          {
            title: 'Broken Row',
            rawTitle: 'Broken Row',
            artist: 'Whoever',
            date: 20260902,
            confidence: 0.9,
          },
          {
            title: 'Another Good Show',
            rawTitle: 'Another Good Show',
            artist: 'Second Band',
            date: '2026-09-03',
            confidence: 0.9,
          },
        ]),
      )

      const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

      expect(result.events).toHaveLength(2)
      expect(result.events.map((evt) => evt.artist)).toEqual([
        'Real Band',
        'Second Band',
      ])

      const droppedLog = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('llm.invalid_event_dropped'))
      expect(droppedLog).toBeDefined()
      expect(droppedLog).toContain('"droppedCount":1')
      expect(droppedLog).toContain('"totalCount":3')
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('falls back to the title when the model returns a null artist', async () => {
    mockCreate.mockResolvedValue(
      makeAnthropicResponse([
        {
          title: 'BPM Bingo',
          rawTitle: 'BPM Bingo',
          artist: null,
          date: '2026-09-01',
          confidence: 0.9,
          isConcert: false,
          reviewNeeded: false,
        },
      ]),
    )

    const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.artist).toBe('BPM Bingo')
  })

  it("still reports 'llm.invalid_tool_input' when every row fails", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse([
          { title: 'A', rawTitle: 'A', artist: 'A', date: 1, confidence: 0.9 },
          { title: 'B', rawTitle: 'B', artist: 'B', date: 2, confidence: 0.9 },
        ]),
      )

      const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

      expect(result.events).toHaveLength(0)
      const invalidLog = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('llm.invalid_tool_input'))
      expect(invalidLog).toBeDefined()

      // A total wipeout reports once, at error severity — the per-row warn
      // would otherwise double-report the same failure into Sentry.
      const droppedLog = warnSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('llm.invalid_event_dropped'))
      expect(droppedLog).toBeUndefined()
    } finally {
      consoleSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })

  // Haiku sometimes serializes the whole `events` array into a JSON string
  // instead of emitting it as an array. Reproduced against the live Cervantes
  // page on 2026-07-25, and the cause of that venue plus Hi-Dive and Red Rocks
  // reporting zero events on 2026-07-24.
  describe('stringified events payload', () => {
    const stringifiedEvent = {
      title: 'Kitchen Dwellers',
      rawTitle: 'Kitchen Dwellers',
      artist: 'Kitchen Dwellers',
      date: '2026-09-12',
      confidence: 0.95,
      isConcert: true,
      reviewNeeded: false,
    }

    it('extracts events when the model returns the array as a JSON string', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_abc123',
            name: 'save_events',
            input: { events: JSON.stringify([stringifiedEvent]) },
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
        stop_reason: 'tool_use',
      })

      const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

      expect(result.events).toHaveLength(1)
      expect(result.events[0]?.title).toBe('Kitchen Dwellers')
    })

    it("reports 'llm.invalid_tool_input' when the string is not parseable JSON", async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'tool_use',
              id: 'tool_abc123',
              name: 'save_events',
              input: { events: '[{"title": "truncated mid-str' },
            },
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          stop_reason: 'tool_use',
        })

        const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

        expect(result.events).toHaveLength(0)
        const invalidLog = consoleSpy.mock.calls
          .map((args) => String(args[0]))
          .find((line) => line.includes('llm.invalid_tool_input'))
        expect(invalidLog).toBeDefined()

        // The Zod failure alone only says "expected array, received string",
        // so the parse error is reported separately to distinguish a payload
        // truncated mid-value from one that was never JSON.
        const parseWarning = warnSpy.mock.calls
          .map((args) => String(args[0]))
          .find((line) => line.includes('llm.stringified_events_unparseable'))
        expect(parseWarning).toBeDefined()
        expect(parseWarning).toContain('"payloadChars":29')
      } finally {
        consoleSpy.mockRestore()
        warnSpy.mockRestore()
      }
    })

    // 2026-08-17: a malformed value ~79.8K into a 100.8K Cervantes payload
    // discarded every event on the page and the venue went dark for the night.
    it('keeps the complete events ahead of a corrupt tail', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const good = JSON.stringify([
          stringifiedEvent,
          { ...stringifiedEvent, title: 'Trampled by Turtles' },
        ])
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'tool_use',
              id: 'tool_abc123',
              name: 'save_events',
              input: {
                events: `${good.slice(0, -1)},{"title":"Cut off mid-val`,
              },
            },
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
          stop_reason: 'tool_use',
        })

        const result = await extractWithLlm('<html>...</html>', SOURCE_URL)

        expect(result.events).toHaveLength(2)
        expect(result.events.map((event) => event.title)).toEqual([
          'Kitchen Dwellers',
          'Trampled by Turtles',
        ])

        const salvageWarning = warnSpy.mock.calls
          .map((args) => String(args[0]))
          .find((line) =>
            line.includes('llm.stringified_events_partially_salvaged'),
          )
        expect(salvageWarning).toBeDefined()
        expect(salvageWarning).toContain('"salvagedEvents":2')
      } finally {
        warnSpy.mockRestore()
      }
    })
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

describe('adjudicateEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trims names and drops the blanks a model sometimes pads a list with', async () => {
    mockAdjudicate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_adj',
          name: 'adjudicate_event',
          input: {
            isConcert: true,
            headliners: ['  Turnstile  ', '   '],
            supportingArtists: ['', ' Snail Mail'],
          },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'tool_use',
    })

    const verdict = await adjudicateEvent({
      title: 'Turnstile',
      description: undefined,
    })

    // A whitespace name is a padded list, not an outage: throwing would turn a
    // usable verdict into a failed adjudication. But it must not survive into
    // headliners, where it would project an unnamed artist row.
    expect(verdict.headliners).toEqual(['Turnstile'])
    expect(verdict.supportingArtists).toEqual(['Snail Mail'])
  })

  it('drops a repeated name, keeping the first spelling', async () => {
    // These are the display arrays. canonical_headliners dedupes on its own, so
    // a doubled name here shows a duplicate chip against a canonical array that
    // disagrees with it.
    mockAdjudicate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool_adj',
          name: 'adjudicate_event',
          input: {
            isConcert: true,
            headliners: ['Sigur Rós', 'sigur rós', 'Sigur Rós'],
            supportingArtists: ['Julianna Barwick', 'julianna barwick'],
          },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'tool_use',
    })

    const verdict = await adjudicateEvent({
      title: 'Sigur Rós',
      description: undefined,
    })

    expect(verdict.headliners).toEqual(['Sigur Rós'])
    expect(verdict.supportingArtists).toEqual(['Julianna Barwick'])
  })
})

// appended to llm.test.ts — the vi.mock('@anthropic-ai/sdk', …) at the top of
// the file is hoisted, so this dynamic import is safe here too.
const { NormalizedEventSchema } = await import('./llm.js')

describe('NormalizedEventSchema', () => {
  it('parses supportingArtists and tourName when present', () => {
    const parsed = NormalizedEventSchema.parse({
      title: 'Wednesday',
      rawTitle: 'Wednesday',
      artist: 'Wednesday',
      supportingArtists: ['Hotline TNT', 'MJ Lenderman'],
      tourName: 'Rat Saw God Tour',
      date: '2026-08-01',
      confidence: 0.9,
    })
    expect(parsed.supportingArtists).toEqual(['Hotline TNT', 'MJ Lenderman'])
    expect(parsed.tourName).toBe('Rat Saw God Tour')
  })

  it('defaults missing supportingArtists/tourName to undefined', () => {
    const parsed = NormalizedEventSchema.parse({
      title: 'Solo Act',
      rawTitle: 'Solo Act',
      artist: 'Solo Act',
      date: '2026-08-01',
      confidence: 0.9,
    })
    expect(parsed.supportingArtists).toBeUndefined()
    expect(parsed.tourName).toBeUndefined()
  })

  it('accepts a null artist (non-concert listings name no performer)', () => {
    const parsed = NormalizedEventSchema.parse({
      title: 'BPM Bingo',
      rawTitle: 'BPM Bingo',
      artist: null,
      date: '2026-08-01',
      confidence: 0.9,
    })
    expect(parsed.artist).toBeNull()
  })
})
