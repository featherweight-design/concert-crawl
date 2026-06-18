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

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'aeg-bluebird.json',
)
const BLUEBIRD_FIXTURE = readFileSync(FIXTURE_PATH, 'utf-8')
const BLUEBIRD_EVENTS_COUNT = JSON.parse(BLUEBIRD_FIXTURE).events.length

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

  it('normalizes the Bluebird fixture into NormalizedEvent rows', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    const result = await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })

    // All fixture events are active=true publishStatus=1, so they should
    // all be normalized.
    expect(result.events.length).toBe(BLUEBIRD_EVENTS_COUNT)

    const first = result.events[0]!
    expect(first.title).toBeTruthy()
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

  it('sends Origin header so AEG blob does not 404', async () => {
    mockFetchOk(BLUEBIRD_FIXTURE)
    await aegFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    const callInit = fetchSpy.mock.calls[0]![1] as RequestInit
    const headers = callInit.headers as Record<string, string>
    expect(headers.Origin).toMatch(/^https?:\/\//)
  })
})
