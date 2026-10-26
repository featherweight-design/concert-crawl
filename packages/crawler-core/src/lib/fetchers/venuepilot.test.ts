import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { CrawlFetchError } from '../fetcher.js'
import * as robots from '../robots.js'
import { PlatformFetchDeadlineError } from './deadline.js'
import {
  venuePilotFetcher,
  VenuePilotFetchError,
  VenuePilotSchemaError,
} from './venuepilot.js'
import type { Venue } from '@concert-crawl/db'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
)
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}
const LEVITT_FIXTURE = loadFixture('venuepilot-levitt.json')

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'Levitt Pavilion Denver',
    slug: 'levitt-pavilion-denver',
    websiteUrl: 'https://levittdenver.org/',
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
    platform: null,
    platformVenueId: null,
    extractionStrategy: null,
    crawlWaitUntil: 'networkidle',
    crawlWaitForSelector: null,
    crawlMode: 'browser',
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
    apiProvider: 'venuepilot',
    apiAccountId: '1105',
    debugCaptureHtml: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Venue
}

// Build a single-page GraphQL response body from an array of events.
function graphqlBody(
  events: unknown[],
  metadata: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    data: {
      paginatedEvents: {
        collection: events,
        metadata: {
          totalCount: events.length,
          totalPages: 1,
          currentPage: 1,
          limitValue: 100,
          ...metadata,
        },
      },
    },
  })
}

describe('venuePilotFetcher.canHandle', () => {
  it('returns true for a venuepilot venue with an account id', () => {
    expect(venuePilotFetcher.canHandle(makeVenue())).toBe(true)
  })

  it('returns false when apiProvider is not venuepilot', () => {
    expect(venuePilotFetcher.canHandle(makeVenue({ apiProvider: null }))).toBe(
      false,
    )
  })

  it('returns false when apiAccountId is missing', () => {
    expect(venuePilotFetcher.canHandle(makeVenue({ apiAccountId: null }))).toBe(
      false,
    )
  })

  it('returns false when apiAccountId is empty', () => {
    expect(venuePilotFetcher.canHandle(makeVenue({ apiAccountId: '' }))).toBe(
      false,
    )
  })

  it('returns false when apiAccountId is whitespace-only', () => {
    expect(
      venuePilotFetcher.canHandle(makeVenue({ apiAccountId: '   ' })),
    ).toBe(false)
  })
})

describe('venuePilotFetcher.fetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  let isAllowedSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    // Stub the robots gate so the rest of the suite keeps asserting on the
    // API requests alone. isAllowed() would otherwise issue its own fetch.
    isAllowedSpy = vi.spyOn(robots, 'isAllowed').mockResolvedValue(true)
  })
  afterEach(() => {
    fetchSpy.mockRestore()
    isAllowedSpy.mockRestore()
  })

  function mockFetchOk(body: string): void {
    fetchSpy.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  it('POSTs the GraphQL endpoint with accountIds + honest UA', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [calledUrl, init] = fetchSpy.mock.calls[0]!
    expect(String(calledUrl)).toBe('https://www.venuepilot.co/graphql')
    expect(init?.method).toBe('POST')
    const headers = new Headers(init?.headers)
    expect(headers.get('User-Agent')).toBe(
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    )
    const body = JSON.parse(String(init?.body))
    expect(body.variables.args.accountIds).toEqual([1105])
    expect(result.sourceUrl).toBe('https://www.venuepilot.co/graphql')
  })

  it('normalizes the Levitt fixture into NormalizedEvent rows', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })

    expect(result.events.length).toBeGreaterThan(0)
    const first = result.events[0]!
    expect(first.title).toBeTruthy()
    expect(first.rawTitle).toBe(first.title)
    expect(first.artist).toBeTruthy()
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(first.showTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(first.confidence).toBe(1.0)
    expect(first.sourceUrl).toBe('https://levittdenver.org/')
  })

  it('trims trailing whitespace on the title', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 1,
          name: 'Trailing Space Show   ',
          date: '2026-08-01',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'The Band' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.title).toBe('Trailing Space Show')
  })

  it('omits ticketUrl when ticketsUrl is whitespace-only', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 1,
          name: 'Whitespace Ticket URL',
          date: '2026-08-01',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '   ',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'A' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.ticketUrl).toBeUndefined()
  })

  it('trims surrounding whitespace on a real ticketsUrl', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 2,
          name: 'Padded Ticket URL',
          date: '2026-08-02',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '  https://tickets.example/show  ',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'A' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.ticketUrl).toBe('https://tickets.example/show')
  })

  it('falls back to the title for artist when announceArtists is empty', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 2,
          name: 'No Artist Listed',
          date: '2026-08-02',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'FREE RSVP/UPGRADE',
          announceArtists: [],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.artist).toBe('No Artist Listed')
  })

  it('omits imageUrl when there are no images', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 3,
          name: 'Imageless',
          date: '2026-08-03',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'X' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.imageUrl).toBeUndefined()
  })

  it('picks the cover variant of the highlighted image', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 4,
          name: 'Has Images',
          date: '2026-08-04',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Y' }],
          announceImages: [
            {
              highlighted: false,
              variants: [{ variant: 'thumb', src: 'https://x/thumb-a.png' }],
            },
            {
              highlighted: true,
              variants: [
                { variant: 'thumb', src: 'https://x/thumb-b.png' },
                { variant: 'cover', src: 'https://x/cover-b.png' },
              ],
            },
          ],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.imageUrl).toBe('https://x/cover-b.png')
  })

  it('skips an event with a whitespace-only name', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 5,
          name: '   ',
          date: '2026-08-05',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Z' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events.length).toBe(0)
  })

  it('strips HTML — including VenuePilot <iframe-embed> — from the description', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 6,
          name: 'HTML Desc',
          date: '2026-08-06',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          // Real VenuePilot markup carries a custom <iframe-embed> element that
          // the shared stripDescriptionHtml() helper leaves intact (unknown tag).
          description:
            '<p style="text-align: center"><strong>Hello</strong> world</p>' +
            '<iframe-embed src="https://embed.example/x">fallback</iframe-embed>',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'Q' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events[0]!.description).toBe('Hello world')
    expect(result.events[0]!.description).not.toContain('<')
    expect(result.events[0]!.description).not.toContain('iframe-embed')
  })

  it('skips an event with a malformed date', async () => {
    mockFetchOk(
      graphqlBody([
        {
          id: 7,
          name: 'Bad Date',
          date: '2026-13-40',
          doorTime: '18:00:00',
          startTime: '19:00:00',
          description: '',
          ticketsUrl: '',
          status: 'BUY TICKETS',
          announceArtists: [{ name: 'BD' }],
          announceImages: [],
        },
      ]),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(result.events.length).toBe(0)
  })

  it('falls back to UTC (no throw) when the venue timezone is invalid', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    const result = await venuePilotFetcher.fetch(
      makeVenue({ timezone: 'Not/AZone' }),
      { crawlDelayMs: 0 },
    )
    expect(result.events.length).toBeGreaterThan(0)
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(body.variables.args.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('passes an abort signal only when perRequestTimeoutMs is set', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(LEVITT_FIXTURE, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const venue = makeVenue()

    await venuePilotFetcher.fetch(venue, {
      crawlDelayMs: 0,
      perRequestTimeoutMs: 15_000,
    })
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)

    await venuePilotFetcher.fetch(venue, { crawlDelayMs: 0 })
    expect(fetchSpy.mock.calls[1]?.[1]?.signal).toBeUndefined()
  })

  it('throws VenuePilotFetchError on a non-200 response', async () => {
    fetchSpy.mockResolvedValue(new Response('nope', { status: 502 }))
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
  })

  it.each([403, 429])(
    'throws a CrawlFetchError on HTTP %s so crawl.ts classifies it as a block',
    async (status) => {
      fetchSpy.mockResolvedValue(new Response('blocked', { status }))
      const error = await venuePilotFetcher
        .fetch(makeVenue(), { crawlDelayMs: 0 })
        .catch((err: unknown) => err)
      expect(error).toBeInstanceOf(CrawlFetchError)
      if (error instanceof CrawlFetchError) {
        expect(error.httpStatus).toBe(status)
      }
    },
  )

  it('throws VenuePilotFetchError when the body carries GraphQL errors on 200', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
  })

  it('throws VenuePilotSchemaError when the response shape is wrong', async () => {
    mockFetchOk(
      JSON.stringify({
        data: { paginatedEvents: { collection: 'not-an-array' } },
      }),
    )
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toBeInstanceOf(VenuePilotSchemaError)
  })

  it('throws VenuePilotFetchError for a whitespace-only apiAccountId without fetching', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    await expect(
      venuePilotFetcher.fetch(makeVenue({ apiAccountId: '   ' }), {
        crawlDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws VenuePilotFetchError for a non-positive apiAccountId', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    await expect(
      venuePilotFetcher.fetch(makeVenue({ apiAccountId: '0' }), {
        crawlDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(VenuePilotFetchError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(['1e2', '0x10', '11.0', '+11', '011'])(
    'rejects a non-decimal apiAccountId (%s) without fetching',
    async (badId) => {
      mockFetchOk(LEVITT_FIXTURE)
      await expect(
        venuePilotFetcher.fetch(makeVenue({ apiAccountId: badId }), {
          crawlDelayMs: 0,
        }),
      ).rejects.toBeInstanceOf(VenuePilotFetchError)
      expect(fetchSpy).not.toHaveBeenCalled()
    },
  )

  // The GraphQL endpoint clears the same robots.txt gate as every page we
  // fetch: it is a path on VenuePilot's host, and robots.txt covers the host.
  it('checks robots.txt for the API endpoint before calling it', async () => {
    mockFetchOk(LEVITT_FIXTURE)
    await venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(isAllowedSpy).toHaveBeenCalledWith(
      'https://www.venuepilot.co/graphql',
      'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
    )
  })

  it('refuses to call the API when robots.txt disallows it', async () => {
    isAllowedSpy.mockResolvedValueOnce(false)
    await expect(
      venuePilotFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow('robots.txt disallows https://www.venuepilot.co/graphql')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loops pages up to metadata.totalPages and concatenates', async () => {
    const pageEvent = (id: number) => ({
      id,
      name: `Show ${id}`,
      date: '2026-08-07',
      doorTime: '18:00:00',
      startTime: '19:00:00',
      description: '',
      ticketsUrl: '',
      status: 'BUY TICKETS',
      announceArtists: [{ name: `A${id}` }],
      announceImages: [],
    })
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          graphqlBody([pageEvent(1)], { totalPages: 2, currentPage: 1 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          graphqlBody([pageEvent(2)], { totalPages: 2, currentPage: 2 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.events.length).toBe(2)
    expect(result.meta?.pagesFetched).toBe(2)
  })

  it('caps pagination at MAX_PAGES against a runaway totalPages', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          graphqlBody(
            [
              {
                id: 1,
                name: 'Runaway',
                date: '2026-08-08',
                doorTime: '18:00:00',
                startTime: '19:00:00',
                description: '',
                ticketsUrl: '',
                status: 'BUY TICKETS',
                announceArtists: [{ name: 'R' }],
                announceImages: [],
              },
            ],
            { totalPages: 9999 },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const result = await venuePilotFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(50)
    // Truncation must be visible in meta so operators can alert on partial fetches.
    expect(result.meta?.truncated).toBe(true)
    expect(result.meta?.totalPages).toBe(9999)
  })

  it('throws instead of returning a partial set when the overall budget runs out', async () => {
    // A slow page against a 50-page ceiling is the #1184 case: a per-request
    // timeout alone lets worst-case wall time reach MAX_PAGES × the budget.
    fetchSpy.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      return new Response(
        graphqlBody(
          [
            {
              id: 1,
              name: 'Slow',
              date: '2026-08-08',
              doorTime: '18:00:00',
              startTime: '19:00:00',
              description: '',
              ticketsUrl: '',
              status: 'BUY TICKETS',
              announceArtists: [{ name: 'S' }],
              announceImages: [],
            },
          ],
          { totalPages: 40 },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    await expect(
      venuePilotFetcher.fetch(makeVenue(), {
        crawlDelayMs: 0,
        overallTimeoutMs: 90,
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError)

    // Loud failure, not a truncated success: crawl.ts's stale-event pass
    // would read the pages we never reached as shows that had come down.
    expect(fetchSpy.mock.calls.length).toBeLessThan(40)
  })
})
