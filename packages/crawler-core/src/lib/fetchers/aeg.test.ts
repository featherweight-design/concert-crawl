import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  aegFetcher,
  AegFetchError,
  AegSchemaError,
  type AegEvent,
} from './aeg.js'
import type { Venue } from '@concert-crawl/db'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
)
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}
const BLUEBIRD_FIXTURE = loadFixture('aeg-bluebird.json')
const BLUEBIRD_EVENTS_COUNT = JSON.parse(BLUEBIRD_FIXTURE).events.length
const GOTHIC_FIXTURE = loadFixture('aeg-gothic.json')
const GOTHIC_EVENTS_COUNT = JSON.parse(GOTHIC_FIXTURE).events.length
const OGDEN_FIXTURE = loadFixture('aeg-ogden.json')
const OGDEN_EVENTS_COUNT = JSON.parse(OGDEN_FIXTURE).events.length

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
    websiteUrl: 'https://www.bluebirdtheater.net/calendar/',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    crawlMode: 'browser',
    crawlDelayMs: 0,
    platform: 'aeg',
    platformVenueId: '2',
    ...overrides,
  } as Venue
}

describe('aegFetcher.canHandle', () => {
  it('returns true for an AEG venue with platform_venue_id', () => {
    expect(aegFetcher.canHandle(makeVenue())).toBe(true)
  })

  it('returns false when platform is not aeg', () => {
    expect(aegFetcher.canHandle(makeVenue({ platform: null }))).toBe(false)
  })

  it('returns false when platform_venue_id is missing', () => {
    expect(aegFetcher.canHandle(makeVenue({ platformVenueId: null }))).toBe(
      false,
    )
  })

  it('returns false when platform_venue_id is empty string', () => {
    expect(aegFetcher.canHandle(makeVenue({ platformVenueId: '' }))).toBe(false)
  })
})

describe('aegFetcher.fetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  function mockFetchOk(body: string): void {
    fetchSpy.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response,
    )
  }

  it('hits the correct events.json URL with the venue shard id', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    const venue = makeVenue({ platformVenueId: '2' })

    const result = await aegFetcher.fetch(venue, { crawlDelayMs: 0 })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const calledUrl = String(fetchSpy.mock.calls[0]![0])
    expect(calledUrl).toBe(
      'https://aegwebprod.blob.core.windows.net/json/events/2/events.json',
    )
    expect(result.sourceUrl).toBe(calledUrl)
  })

  it('passes an abort signal when timeoutMs is set, none otherwise', async () => {
    // Fresh Response per call — a shared Response body can only be read once
    fetchSpy.mockImplementation(async () => {
      return new Response(BLUEBIRD_FIXTURE, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const venue = makeVenue({ platformVenueId: '2' })

    await aegFetcher.fetch(venue, { crawlDelayMs: 0, timeoutMs: 15_000 })
    const withTimeoutInit = fetchSpy.mock.calls[0]?.[1]
    expect(withTimeoutInit?.signal).toBeInstanceOf(AbortSignal)

    await aegFetcher.fetch(venue, { crawlDelayMs: 0 })
    const withoutTimeoutInit = fetchSpy.mock.calls[1]?.[1]
    expect(withoutTimeoutInit?.signal).toBeUndefined()
  })

  it('normalizes the Bluebird fixture into NormalizedEvent rows', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })

    // All fixture events are active=true publishStatus=1, so they should
    // all be normalized.
    expect(result.events.length).toBe(BLUEBIRD_EVENTS_COUNT)

    const first = result.events[0]!
    expect(first.title).toBeTruthy()
    // AEG ships the canonical headline directly — no LLM-style decoration —
    // so `rawTitle` mirrors `title` and the cross-venue filter sees the
    // same string regardless of extractor (#826).
    expect(first.rawTitle).toBe(first.title)
    expect(first.artist).toBeTruthy()
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.showTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(first.confidence).toBe(1.0)
    expect(first.sourceUrl).toBe('https://www.bluebirdtheater.net/calendar/')
  })

  it('parses eventDateTimeISO local-portion without UTC drift on late-night shows', async () => {
    // Bluebird show: "2026-06-18T20:00:00-06:00" should produce
    // date='2026-06-18' showTime='20:00:00', NOT the UTC-converted next-day
    // date (which would have happened if we round-tripped through Date).
    // AEG embeds tour names in headlinersText with a colon separator
    // ("Chelsea Cutler: Proof of Life"); look up the event by its known
    // eventId from the fixture instead of by clean artist.
    mockFetchOk(BLUEBIRD_FIXTURE)
    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    const target = result.events.find((evt) =>
      evt.artist.startsWith('Chelsea Cutler'),
    )
    expect(target).toBeDefined()
    expect(target!.date).toBe('2026-06-18')
    expect(target!.showTime).toBe('20:00:00')
  })

  it('preserves supporting acts + tour info in the description', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    // Jessica Baio fixture event has supporting='Britton' and tour='The Other Side Tour'
    const target = result.events.find((evt) => evt.artist === 'Jessica Baio')
    expect(target).toBeDefined()
    expect(target!.description).toContain('Britton')
    expect(target!.description).toContain('The Other Side Tour')
  })

  it('strips HTML from the AEG description field before composing (#827)', async () => {
    // Gothic prod incident shape: AEG's `description` ships RHP-CMS HTML
    // (`<p>` tags + entities). Before #827 this leaked through to
    // `events.description` and the consumer UI rendered the literal
    // `<p>` markers as text. After the fix, only plain text should
    // survive — supporting/tour fields remain plain as well, and
    // composition preserves the blank-line separator between sections.
    const parsed = JSON.parse(BLUEBIRD_FIXTURE) as { events: AegEvent[] }
    const htmlEvent = {
      ...parsed.events[0]!,
      description:
        '<p>NPR&#039;s Tiny Desk Contest is back on the road in 2026!</p><p>This year&#039;s winner is Cure For Paranoia.</p>',
    }
    const synthetic = JSON.stringify({
      meta: { total: 1 },
      events: [htmlEvent],
    })
    mockFetchOk(synthetic)

    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(result.events.length).toBe(1)
    const desc = result.events[0]!.description!
    expect(desc).not.toMatch(/<p>/i)
    expect(desc).not.toMatch(/&#039;/)
    expect(desc).toContain(
      "NPR's Tiny Desk Contest is back on the road in 2026!",
    )
    expect(desc).toContain("This year's winner is Cure For Paranoia.")
  })

  it('filters inactive events', async () => {
    // Synthesize a payload with one active + one inactive event
    const parsed = JSON.parse(BLUEBIRD_FIXTURE) as { events: AegEvent[] }
    const inactiveCopy = { ...parsed.events[0]!, active: false }
    const synthetic = JSON.stringify({
      meta: { total: 2 },
      events: [parsed.events[0]!, inactiveCopy],
    })
    mockFetchOk(synthetic)

    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(result.events.length).toBe(1)
  })

  it('filters events with publishStatus !== 1 (drafts)', async () => {
    const parsed = JSON.parse(BLUEBIRD_FIXTURE) as { events: AegEvent[] }
    const draftCopy = { ...parsed.events[0]!, publishStatus: 0 }
    const synthetic = JSON.stringify({
      meta: { total: 2 },
      events: [parsed.events[0]!, draftCopy],
    })
    mockFetchOk(synthetic)

    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(result.events.length).toBe(1)
  })

  it('throws AegFetchError on HTTP non-2xx', async () => {
    fetchSpy.mockResolvedValue(
      new Response('not found', { status: 404 }) as Response,
    )
    await expect(
      aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(AegFetchError)
  })

  it('throws AegSchemaError when the response shape is wrong', async () => {
    mockFetchOk(JSON.stringify({ totally: 'wrong shape' }))
    await expect(
      aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(AegSchemaError)
  })

  // Regression: Gothic shard 37's events omit `ticketURL` from `ticketing`
  // entirely (only `url` is present). The previous schema required
  // `ticketURL` to exist (just nullable), which rejected every Gothic event
  // = 56 issues per fetch and 0 events ingested for days. See #720.
  it('parses Gothic fixture (ticketing omits ticketURL key)', async () => {
    mockFetchOk(GOTHIC_FIXTURE)
    const venue = makeVenue({
      name: 'Gothic Theatre',
      slug: 'gothic-theatre',
      websiteUrl: 'https://www.gothictheatre.com/calendar/',
      platformVenueId: '37',
    })
    const result = await aegFetcher.fetch(venue, { crawlDelayMs: 0 })
    expect(result.events.length).toBe(GOTHIC_EVENTS_COUNT)
    expect(result.events[0]!.sourceUrl).toBe(
      'https://www.gothictheatre.com/calendar/',
    )
  })

  it('accepts a ticketing object that omits ticketURL', async () => {
    const parsed = JSON.parse(BLUEBIRD_FIXTURE) as {
      meta: { total: number }
      events: AegEvent[]
    }
    const event = { ...parsed.events[0]! }
    const ticketingWithoutTicketURL = {
      ...((event.ticketing ?? {}) as Record<string, unknown>),
    }
    delete ticketingWithoutTicketURL.ticketURL
    const fallbackUrl = ticketingWithoutTicketURL.url
    expect(typeof fallbackUrl).toBe('string')
    const synthetic = JSON.stringify({
      meta: { total: 1 },
      events: [{ ...event, ticketing: ticketingWithoutTicketURL }],
    })
    mockFetchOk(synthetic)

    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(result.events.length).toBe(1)
    // Falls back to ticketing.url when ticketURL is absent.
    expect(result.events[0]!.ticketUrl).toBe(fallbackUrl)
  })

  // Regression: Ogden shard 7 had an event with eventDateTimeISO: "TBD".
  // The previous parser threw, killing the entire crawl run. Now we skip
  // events with unparseable dates so the rest of the shard still ingests.
  // See #720.
  it('skips events with unparseable eventDateTimeISO (e.g. "TBD") instead of failing the run', async () => {
    mockFetchOk(OGDEN_FIXTURE)
    const venue = makeVenue({
      name: 'Ogden Theatre',
      slug: 'ogden-theatre',
      websiteUrl: 'https://www.ogdentheatre.com/calendar/',
      platformVenueId: '7',
    })
    const result = await aegFetcher.fetch(venue, { crawlDelayMs: 0 })
    // Fixture has 57 events total; exactly one has eventDateTimeISO: "TBD".
    // Skip that one, keep the other 56.
    const tbdCount = (
      JSON.parse(OGDEN_FIXTURE) as { events: AegEvent[] }
    ).events.filter((evt) => evt.eventDateTimeISO === 'TBD').length
    expect(tbdCount).toBe(1)
    expect(result.events.length).toBe(OGDEN_EVENTS_COUNT - 1)
    // Sanity: the TBD event's artist isn't in the result.
    expect(
      result.events.some((evt) => evt.artist === 'Earl Sweatshirt & MIKE'),
    ).toBe(false)
  })

  it('skips a synthetic event with eventDateTimeISO === "TBD"', async () => {
    const parsed = JSON.parse(BLUEBIRD_FIXTURE) as {
      meta: { total: number }
      events: AegEvent[]
    }
    const tbdEvent = {
      ...parsed.events[0]!,
      eventId: 'tbd-1',
      eventDateTimeISO: 'TBD',
    }
    const synthetic = JSON.stringify({
      meta: { total: 2 },
      events: [parsed.events[0]!, tbdEvent],
    })
    mockFetchOk(synthetic)

    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(result.events.length).toBe(1)
  })

  it('sets crawlDelayMs as a leading delay before the fetch', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    const start = Date.now()
    await aegFetcher.fetch(makeVenue({ crawlDelayMs: 50 }), {
      crawlDelayMs: 50,
    })
    const elapsed = Date.now() - start
    // 50ms delay + the fetch itself (mocked synchronous). Allow some scheduler
    // slack on either side; the important check is that we slept >= 40ms.
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })

  it('derives the Origin header from the venue website per-venue', async () => {
    // AEG's CORS layer may enforce origin per-venue; sending the venue's
    // own origin means a future allowlist change doesn't silently 404
    // a single venue. Verify two different venues produce two different
    // Origin headers.
    mockFetchOk(BLUEBIRD_FIXTURE)
    await aegFetcher.fetch(
      makeVenue({ websiteUrl: 'https://www.bluebirdtheater.net/calendar/' }),
      { crawlDelayMs: 0 },
    )
    const bluebirdHeaders = (fetchSpy.mock.calls[0]![1] as RequestInit)
      .headers as Record<string, string>
    expect(bluebirdHeaders.Origin).toBe('https://www.bluebirdtheater.net')

    fetchSpy.mockClear()
    mockFetchOk(BLUEBIRD_FIXTURE)
    await aegFetcher.fetch(
      makeVenue({
        websiteUrl: 'https://www.gothictheatre.com/calendar/',
        platformVenueId: '37',
      }),
      { crawlDelayMs: 0 },
    )
    const gothicHeaders = (fetchSpy.mock.calls[0]![1] as RequestInit)
      .headers as Record<string, string>
    expect(gothicHeaders.Origin).toBe('https://www.gothictheatre.com')
  })
})
