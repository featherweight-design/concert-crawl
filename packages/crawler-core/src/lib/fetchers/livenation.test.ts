import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  liveNationFetcher,
  LiveNationFetchError,
  reassembleFlightPayload,
  extractEventRecords,
  parseCalendarUrls,
} from './livenation.js'
import type { Venue } from '@concert-crawl/db'
import { PlatformFetchDeadlineError } from './deadline.js'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
)
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}

// Captured verbatim from https://www.fillmoredenver.com on 2026-07-25.
const CALENDAR_HTML = loadFixture('livenation-fillmore-2026-12.html')
const SITEMAP_XML = loadFixture('livenation-fillmore-sitemap.xml')

const FILLMORE_VENUE_ID = 'KovZpZAE6eJA'

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'The Fillmore Auditorium',
    slug: 'fillmore-auditorium',
    websiteUrl: 'https://www.fillmoredenver.com/shows',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    verifiedBy: null,
    verifiedAt: null,
    lastCrawledAt: null,
    crawlNotes: null,
    crawlDelayMs: 0,
    robotsTxtAllowed: null,
    robotsTxtCheckedAt: null,
    consecutiveFailures: 0,
    blockedAt: null,
    lastEventCountAlertAt: null,
    platform: 'livenation',
    platformVenueId: FILLMORE_VENUE_ID,
    extractionStrategy: null,
    crawlWaitUntil: 'networkidle',
    crawlWaitForSelector: null,
    crawlMode: 'http',
    address: null,
    capacity: null,
    venueType: null,
    about: null,
    neighborhood: null,
    featured: false,
    lat: null,
    lng: null,
    contactEmail: null,
    priceUrl: null,
    ticketVendor: null,
    apiProvider: null,
    apiAccountId: null,
    debugCaptureHtml: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Venue
}

/**
 * Serve the sitemap for the sitemap URL and the December fixture for every
 * calendar URL. Real months differ, but the fetcher's month handling is
 * uniform and the dedupe-by-event-id assertion below is what proves it.
 */
function mockSiteFetch(
  overrides: { sitemap?: string; calendar?: string; robots?: string } = {},
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) => {
    let body: string
    if (url.endsWith('/robots.txt')) {
      body = overrides.robots ?? 'User-agent: *\nAllow: /\n'
    } else if (url.endsWith('/sitemap.xml')) {
      body = overrides.sitemap ?? SITEMAP_XML
    } else {
      body = overrides.calendar ?? CALENDAR_HTML
    }
    return { ok: true, status: 200, text: async () => body }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Re-host the captured sitemap so it matches a test-local origin. */
function sitemapFor(origin: string): string {
  return SITEMAP_XML.replaceAll('https://www.fillmoredenver.com', origin)
}

/**
 * robots.txt is cached per origin for the module's lifetime, so the number
 * of robots requests in a run depends on test order. Assertions about how
 * much of the site we pulled count only the sitemap + calendar requests.
 */
function pageFetchCount(fetchMock: ReturnType<typeof vi.fn>): number {
  return fetchMock.mock.calls.filter(
    ([url]) => !String(url).endsWith('/robots.txt'),
  ).length
}

describe('liveNationFetcher.canHandle', () => {
  it('claims a venue with platform=livenation and a platform venue id', () => {
    expect(liveNationFetcher.canHandle(makeVenue())).toBe(true)
  })

  it('declines a venue on another platform', () => {
    expect(liveNationFetcher.canHandle(makeVenue({ platform: 'aeg' }))).toBe(
      false,
    )
  })

  it('declines a livenation venue with no platform venue id, so it falls back to the cascade rather than fetching unfilterable pages', () => {
    expect(
      liveNationFetcher.canHandle(makeVenue({ platformVenueId: null })),
    ).toBe(false)
  })
})

describe('parseCalendarUrls', () => {
  it('pulls the rolling month window out of the real sitemap', () => {
    const urls = parseCalendarUrls(
      SITEMAP_XML,
      'https://www.fillmoredenver.com',
    )
    expect(urls).toHaveLength(12)
    expect(urls[0]).toMatch(/\/shows\/calendar\/\d{4}-\d{2}$/)
  })

  it('ignores non-calendar pages', () => {
    const urls = parseCalendarUrls(
      SITEMAP_XML,
      'https://www.fillmoredenver.com',
    )
    expect(urls.every((url) => url.includes('/shows/calendar/'))).toBe(true)
  })

  it('drops calendar URLs belonging to a sister venue sharing the sitemap', () => {
    const xml = `<urlset>
      <loc>https://www.fillmoredenver.com/shows/calendar/2026-12</loc>
      <loc>https://www.marquisdenver.com/shows/calendar/2026-12</loc>
    </urlset>`
    expect(parseCalendarUrls(xml, 'https://www.fillmoredenver.com')).toEqual([
      'https://www.fillmoredenver.com/shows/calendar/2026-12',
    ])
  })
})

describe('flight payload parsing', () => {
  it('recovers event records from the real calendar page', () => {
    const records = extractEventRecords(reassembleFlightPayload(CALENDAR_HTML))
    expect(records.length).toBeGreaterThan(0)
  })

  it('joins chunks so a record straddling a push() boundary still parses', () => {
    // The `name` value is split across two pushes; parsing them
    // independently would yield two unparseable fragments.
    const html =
      'x<script>self.__next_f.push([1,"a:[{\\"tm_id\\":\\"1\\",\\"start_date_local\\":\\"2026-12-03\\",\\"nam"])</script>' +
      '<script>self.__next_f.push([1,"e\\":\\"Split Record\\"}]"])</script>'
    const flight = reassembleFlightPayload(html)
    expect(flight).toContain('"name":"Split Record"')
  })

  it('is not thrown off by brackets inside event titles', () => {
    const flight =
      '{"data":[{"tm_id":"1","start_date_local":"2026-12-03","name":"A [Bracket] } Title"}]}'
    const records = extractEventRecords(flight)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ name: 'A [Bracket] } Title' })
  })

  it('ignores "data" arrays that are not event lists', () => {
    const flight = '{"data":["/_next/static/chunks/abc.js","other.js"]}'
    expect(extractEventRecords(flight)).toEqual([])
  })

  it('returns nothing rather than throwing on a page with no flight payload', () => {
    expect(
      extractEventRecords(reassembleFlightPayload('<html></html>')),
    ).toEqual([])
  })
})

describe('liveNationFetcher.fetch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('walks every month in the sitemap and returns the venue calendar as sourceUrl', async () => {
    const fetchMock = mockSiteFetch()
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    // 1 sitemap + 12 months.
    expect(pageFetchCount(fetchMock)).toBe(13)
    expect(result.sourceUrl).toBe('https://www.fillmoredenver.com/sitemap.xml')
    expect(result.meta?.calendarMonthsFetched).toBe(12)
  })

  it('abandons the run when the 13 requests overrun the overall budget', async () => {
    // The admin probe's budget is a wall-clock ceiling, and this adapter is
    // the reason it has to be: 13 sequential requests against a per-request
    // timeout could hold an API worker slot for minutes (#1184).
    const fetchMock = vi.fn(async (url: string) => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      let body: string
      if (url.endsWith('/robots.txt')) body = 'User-agent: *\nAllow: /\n'
      else if (url.endsWith('/sitemap.xml')) body = SITEMAP_XML
      else body = CALENDAR_HTML
      return { ok: true, status: 200, text: async () => body }
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      liveNationFetcher.fetch(makeVenue(), {
        crawlDelayMs: 0,
        overallTimeoutMs: 60,
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError)

    expect(pageFetchCount(fetchMock)).toBeLessThan(13)
  })

  it('dedupes by event id so a show listed on two months is emitted once', async () => {
    mockSiteFetch()
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    // Every month served the same fixture, so without the dedupe this
    // would be 12x the December event count.
    const ids = result.events.map((event) => `${event.date}|${event.title}`)
    expect(new Set(ids).size).toBe(result.events.length)
    expect(result.meta?.rawRecordCount).toBeGreaterThan(result.events.length)
  })

  it('normalizes a real record into a NormalizedEvent', async () => {
    mockSiteFetch()
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    const event = result.events.find((candidate) =>
      candidate.title.includes('Fetty Wap'),
    )
    expect(event).toBeDefined()
    expect(event).toMatchObject({
      date: '2026-12-06',
      showTime: '19:00:00',
      confidence: 1.0,
    })
    // The fixture serves the same calendar for all 12 sitemap months, so
    // which month wins the dedupe is a fixture artifact — assert the shape
    // here and pin the exact URL in the single-month test below.
    expect(event!.sourceUrl).toMatch(
      /^https:\/\/www\.fillmoredenver\.com\/shows\/calendar\/\d{4}-\d{2}$/,
    )
    // rawTitle mirrors title on platform fetches — the source ships the
    // venue's own headline with no LLM-style decoration (#826).
    expect(event!.rawTitle).toBe(event!.title)
    expect(event!.ticketUrl).toContain('ticketmaster.com')
  })

  it('sets each event sourceUrl to the calendar month it was found on, not /shows', async () => {
    mockSiteFetch({
      sitemap: `<?xml version="1.0" encoding="UTF-8"?>
        <urlset><url>
          <loc>https://www.fillmoredenver.com/shows/calendar/2026-12</loc>
        </url></urlset>`,
    })
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events.length).toBeGreaterThan(0)
    for (const event of result.events) {
      expect(event.sourceUrl).toBe(
        'https://www.fillmoredenver.com/shows/calendar/2026-12',
      )
    }
  })

  it('extracts the far-future shows the JSON-LD cascade truncated away (#1127)', async () => {
    mockSiteFetch()
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    // These December dates sat past the site's 36-item JSON-LD ceiling and
    // are exactly the events the #1122 audit flagged as missing.
    const dates = result.events.map((event) => event.date)
    expect(dates).toContain('2026-12-06')
    expect(dates).toContain('2026-12-08')
  })

  it('drops records belonging to a sister venue', async () => {
    mockSiteFetch()
    const result = await liveNationFetcher.fetch(
      makeVenue({ platformVenueId: 'KovZpZAsomeOther' }),
      { crawlDelayMs: 0 },
    )
    expect(result.events).toHaveLength(0)
    expect(result.meta?.otherVenueCount).toBeGreaterThan(0)
  })

  it('throws when the sitemap advertises no calendar months, rather than reporting an empty crawl', async () => {
    mockSiteFetch({ sitemap: '<urlset></urlset>' })
    await expect(
      liveNationFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(LiveNationFetchError)
  })

  // crawl.ts gates only venue.websiteUrl, which is a different path from the
  // ones this fetcher requests — so the adapter has to gate them itself.
  // Each of these uses its own origin because robots.txt is cached per origin
  // for the module's lifetime.
  it('skips calendar months robots.txt disallows and still returns the rest', async () => {
    const fetchMock = mockSiteFetch({
      robots: 'User-agent: *\nDisallow: /shows/calendar/2026-12\n',
      sitemap: sitemapFor('https://robots-partial.example.com'),
    })
    const result = await liveNationFetcher.fetch(
      makeVenue({ websiteUrl: 'https://robots-partial.example.com/shows' }),
      { crawlDelayMs: 0 },
    )
    expect(result.meta?.robotsSkippedCount).toBe(1)
    expect(result.meta?.calendarMonthsFetched).toBe(11)
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/shows/calendar/2026-12'),
      ),
    ).toBe(false)
  })

  it('throws rather than reporting an empty crawl when robots.txt disallows the sitemap', async () => {
    mockSiteFetch({
      robots: 'User-agent: *\nDisallow: /sitemap.xml\n',
      sitemap: sitemapFor('https://robots-sitemap.example.com'),
    })
    await expect(
      liveNationFetcher.fetch(
        makeVenue({ websiteUrl: 'https://robots-sitemap.example.com/shows' }),
        { crawlDelayMs: 0 },
      ),
    ).rejects.toThrow(LiveNationFetchError)
  })

  it('throws when robots.txt disallows every calendar month', async () => {
    mockSiteFetch({
      robots: 'User-agent: *\nDisallow: /shows/calendar/\n',
      sitemap: sitemapFor('https://robots-all.example.com'),
    })
    await expect(
      liveNationFetcher.fetch(
        makeVenue({ websiteUrl: 'https://robots-all.example.com/shows' }),
        { crawlDelayMs: 0 },
      ),
    ).rejects.toThrow(LiveNationFetchError)
  })

  it('surfaces an HTTP error as LiveNationFetchError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, text: async () => '' })),
    )
    await expect(
      liveNationFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(LiveNationFetchError)
  })

  it('counts schema-rejected records instead of failing the whole crawl', async () => {
    mockSiteFetch({
      calendar:
        '<script>self.__next_f.push([1,"{\\"data\\":[{\\"tm_id\\":\\"1\\",\\"start_date_local\\":\\"2026-12-03\\"}]}"])</script>',
    })
    const result = await liveNationFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    // Missing the required `name` field.
    expect(result.meta?.schemaRejectCount).toBe(12)
    expect(result.events).toHaveLength(0)
  })
})
