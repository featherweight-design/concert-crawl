import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  detailPageFetcher,
  DetailPageFetchError,
  extractCandidateUrls,
  normalizeCandidateUrl,
  parseSitemapUrls,
  MAX_DETAIL_PAGES,
} from './detail-page.js'
import { dispatch } from './dispatch.js'
import { PlatformFetchDeadlineError } from './deadline.js'
import type { Venue } from '@concert-crawl/db'

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
)
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}

// Captured from https://events.blackboxdenver.co on 2026-08-03 with our own
// user agent, then stripped of <script>/<style>/comment noise (the JSON-LD
// block is preserved verbatim). Nothing on this path is ever sent to an LLM.
const LISTING_HTML = loadFixture('detail-page-blackbox-listing.html')
const DETAIL_HTML = loadFixture('detail-page-blackbox-event.html')
const SITEMAP_XML = loadFixture('detail-page-blackbox-sitemap.xml')

const LISTING_URL = 'https://events.blackboxdenver.co/'
const ORIGIN = 'https://events.blackboxdenver.co'

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: crypto.randomUUID(),
    name: 'The Black Box',
    slug: 'the-black-box',
    websiteUrl: LISTING_URL,
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
    platform: 'detail-page',
    platformVenueId: null,
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

interface SiteOverrides {
  robots?: string
  sitemap?: string
  listing?: string
  detail?: (url: string) => { ok: boolean; status: number; body: string }
}

/**
 * Serve robots.txt, the sitemap, the listing index and a detail page for
 * every other URL. The real site's detail pages differ only in their JSON-LD
 * payload, and the mapping assertions below read one real payload — what the
 * fetcher's page loop needs to be proven on is which URLs it visits.
 */
function mockSiteFetch(
  overrides: SiteOverrides = {},
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) => {
    const asString = String(url)
    if (asString.endsWith('/robots.txt')) {
      return {
        ok: true,
        status: 200,
        text: async () => overrides.robots ?? 'User-agent: *\nAllow: /\n',
      }
    }
    if (asString.endsWith('/sitemap.xml')) {
      const body = overrides.sitemap ?? SITEMAP_XML
      if (body === '') return { ok: false, status: 404, text: async () => '' }
      return { ok: true, status: 200, text: async () => body }
    }
    if (asString === LISTING_URL || asString === ORIGIN) {
      return {
        ok: true,
        status: 200,
        text: async () => overrides.listing ?? LISTING_HTML,
      }
    }
    const detail = overrides.detail?.(asString)
    if (detail) {
      return {
        ok: detail.ok,
        status: detail.status,
        text: async () => detail.body,
      }
    }
    return { ok: true, status: 200, text: async () => DETAIL_HTML }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * robots.txt is cached per origin for the module's lifetime, so the number
 * of robots requests in a run depends on test order. Assertions about how
 * much of the site we pulled count only the page requests.
 */
function pageRequests(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => !url.endsWith('/robots.txt'))
}

describe('detailPageFetcher.canHandle', () => {
  it('claims a venue with platform=detail-page', () => {
    expect(detailPageFetcher.canHandle(makeVenue())).toBe(true)
  })

  it('declines a venue on another platform', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ platform: 'aeg' }))).toBe(
      false,
    )
  })

  it('declines a venue with no platform set at all', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ platform: null }))).toBe(
      false,
    )
  })

  it('declines when the listing URL is missing, since websiteUrl IS the listing', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ websiteUrl: '' }))).toBe(
      false,
    )
  })
})

describe('dispatch', () => {
  it('routes a detail-page venue to this fetcher', () => {
    expect(dispatch(makeVenue())).toBe(detailPageFetcher)
  })

  it('leaves a platformless venue on the cascade', () => {
    expect(dispatch(makeVenue({ platform: null }))).toBeNull()
  })
})

describe('normalizeCandidateUrl', () => {
  it('resolves a relative href against the listing', () => {
    expect(normalizeCandidateUrl('/e/joker-aug15', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    )
  })

  it('strips a trailing /tickets so the calendar link points at the JSON-LD page', () => {
    expect(normalizeCandidateUrl('/e/joker-aug15/tickets', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    )
    expect(normalizeCandidateUrl('/e/joker-aug15/tickets/', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    )
  })

  it('collapses trailing slashes, query strings and fragments to one candidate', () => {
    const canonical = `${ORIGIN}/e/joker-aug15`
    expect(normalizeCandidateUrl('/e/joker-aug15/', LISTING_URL)).toBe(
      canonical,
    )
    expect(normalizeCandidateUrl('/e/joker-aug15?utm=x', LISTING_URL)).toBe(
      canonical,
    )
    expect(normalizeCandidateUrl('/e/joker-aug15#lineup', LISTING_URL)).toBe(
      canonical,
    )
  })

  it('rejects cross-origin hrefs — the venue site is the only thing we may read', () => {
    expect(
      normalizeCandidateUrl('https://www.eventbrite.com/e/12345', LISTING_URL),
    ).toBeNull()
    expect(
      normalizeCandidateUrl('//www.eventbrite.com/e/12345', LISTING_URL),
    ).toBeNull()
    expect(
      normalizeCandidateUrl('http://events.blackboxdenver.co/e/x', LISTING_URL),
    ).toBeNull()
  })

  it('rejects non-http schemes and asset URLs', () => {
    expect(normalizeCandidateUrl('mailto:info@example.com', LISTING_URL)).toBe(
      null,
    )
    expect(normalizeCandidateUrl('tel:+13035551212', LISTING_URL)).toBeNull()
    expect(normalizeCandidateUrl('/assets/app.css', LISTING_URL)).toBeNull()
    expect(normalizeCandidateUrl('/img/logo.png', LISTING_URL)).toBeNull()
  })
})

describe('extractCandidateUrls', () => {
  it('pulls every event link out of the real Black Box listing', () => {
    const urls = extractCandidateUrls(LISTING_HTML, LISTING_URL)
    expect(urls).toContain(`${ORIGIN}/e/joker-aug15`)
    // Every /e/ candidate has had its /tickets suffix removed.
    expect(urls.filter((url) => url.endsWith('/tickets'))).toEqual([])
    expect(urls.filter((url) => url.includes('/e/')).length).toBeGreaterThan(30)
  })

  it('never returns a cross-origin URL, even when the listing links out', () => {
    const html = `
      <a href="/e/one/tickets">One</a>
      <a href="https://www.eventbrite.com/e/99999">Buy on Eventbrite</a>
      <a href="//cdn.example.com/logo.png">logo</a>
    `
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([`${ORIGIN}/e/one`])
  })

  it('dedupes links that normalize to the same page', () => {
    const html = `
      <a href="/e/one">One</a>
      <a href="/e/one/tickets">Tickets</a>
      <a href='/e/one/?utm_source=nav'>Again</a>
    `
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([`${ORIGIN}/e/one`])
  })

  it('excludes the listing URL itself', () => {
    const html = `<a href="/">Home</a><a href="${LISTING_URL}">Home again</a><a href="/e/one">One</a>`
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([`${ORIGIN}/e/one`])
  })
})

describe('parseSitemapUrls', () => {
  it('normalizes sitemap locs the same way as listing anchors', () => {
    const urls = parseSitemapUrls(SITEMAP_XML, LISTING_URL)
    expect(urls.has(`${ORIGIN}/e/hip-hop-summit-denver-sep5`)).toBe(true)
    // /e/x and /e/x/tickets both appear in the real sitemap and collapse.
    expect([...urls].some((url) => url.endsWith('/tickets'))).toBe(false)
  })
})

describe('detailPageFetcher.fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows each event link and maps its MusicEvent JSON-LD', async () => {
    const fetchMock = mockSiteFetch()
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })

    const requested = pageRequests(fetchMock)
    expect(requested[0]).toBe(`${ORIGIN}/sitemap.xml`)
    expect(requested[1]).toBe(LISTING_URL)
    // The sitemap intersection keeps the non-event pages the listing links
    // to (the FAQ, in the real capture) out of the request set entirely.
    expect(requested.slice(2).every((url) => url.includes('/e/'))).toBe(true)
    expect(requested.every((url) => url.startsWith(ORIGIN))).toBe(true)
    expect(requested.length).toBeLessThanOrEqual(MAX_DETAIL_PAGES + 2)

    expect(result.sourceUrl).toBe(LISTING_URL)
    expect(result.events.length).toBe(requested.length - 2)

    const event = result.events[0]!
    expect(event.title).toBe('Hip-Hop Summit Denver')
    expect(event.artist).toBe('Hip-Hop Summit Denver')
    // startDate is "2026-09-05T12:00:00-06:00" — the tz offset resolves to
    // the same civil date in America/Denver.
    expect(event.date).toBe('2026-09-05')
    expect(event.showTime).toBe('12:00:00')
    expect(event.sourceUrl).toMatch(/\/e\//)
    expect(event.ticketUrl).toBe(
      `${ORIGIN}/e/hip-hop-summit-denver-sep5/tickets`,
    )
    expect(event.confidence).toBe(1)
    // The description arrives entity-encoded (&nbsp;, &rsquo;) and comes out
    // decoded plain text.
    expect(event.description).toContain('Colorado’s premier')
    expect(event.description).not.toContain('&rsquo;')
    expect(event.description).not.toContain('&nbsp;')
  })

  it('never requests a cross-origin URL', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one/tickets">One</a><a href="https://www.eventbrite.com/e/9">Buy</a>`,
      sitemap: '',
    })
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    expect(
      pageRequests(fetchMock).some((url) => url.includes('eventbrite')),
    ).toBe(false)
  })

  it('skips a detail page with no JSON-LD, and one whose JSON-LD is not an Event', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">One</a><a href="/e/two">Two</a><a href="/e/three">Three</a>`,
      sitemap: '',
      detail: (url) => {
        if (url.endsWith('/e/one')) {
          return {
            ok: true,
            status: 200,
            body: '<html><body>no ld</body></html>',
          }
        }
        if (url.endsWith('/e/two')) {
          return {
            ok: true,
            status: 200,
            body: `<script type="application/ld+json">{"@context":"http://schema.org","@type":"WebSite","name":"The Black Box"}</script>`,
          }
        }
        return { ok: true, status: 200, body: DETAIL_HTML }
      },
    })
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    // sitemap (404) + listing + 3 detail pages
    expect(pageRequests(fetchMock)).toHaveLength(5)
    expect(result.events).toHaveLength(1)
    expect(result.meta?.['pagesWithoutEvents']).toBe(2)
  })

  it('tolerates a handful of failed detail pages but gives up past the cap', async () => {
    mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a><a href="/e/three">3</a>`,
      sitemap: '',
      detail: (url) =>
        url.endsWith('/e/one')
          ? { ok: false, status: 404, body: '' }
          : { ok: true, status: 200, body: DETAIL_HTML },
    })
    const tolerated = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(tolerated.events).toHaveLength(2)
    expect(tolerated.meta?.['failedPageCount']).toBe(1)

    mockSiteFetch({
      listing: `<a href="/e/1">1</a><a href="/e/2">2</a><a href="/e/3">3</a><a href="/e/4">4</a><a href="/e/5">5</a>`,
      sitemap: '',
      detail: () => ({ ok: false, status: 500, body: '' }),
    })
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(DetailPageFetchError)
  })

  it('falls back to listing anchors when the site publishes no sitemap', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one/tickets">One</a>`,
      sitemap: '',
    })
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(pageRequests(fetchMock)).toContain(`${ORIGIN}/e/one`)
    expect(result.events).toHaveLength(1)
  })

  it('ignores a sitemap that matches none of the listing links rather than zeroing the run', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">One</a>`,
      sitemap: `<urlset><url><loc>${ORIGIN}/e/long-gone</loc></url></urlset>`,
    })
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    })
    expect(pageRequests(fetchMock)).toContain(`${ORIGIN}/e/one`)
    expect(pageRequests(fetchMock)).not.toContain(`${ORIGIN}/e/long-gone`)
    expect(result.events).toHaveLength(1)
  })

  it('throws when robots.txt disallows the listing', async () => {
    mockSiteFetch({ robots: 'User-agent: *\nDisallow: /\n' })
    await expect(
      detailPageFetcher.fetch(
        makeVenue({ websiteUrl: 'https://robots-blocked.example/' }),
        { crawlDelayMs: 0 },
      ),
    ).rejects.toThrow(DetailPageFetchError)
  })

  it('throws when the listing has nothing to follow', async () => {
    mockSiteFetch({ listing: '<html><body>Nothing here</body></html>' })
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(/no same-origin links/)
  })

  it('throws PlatformFetchDeadlineError rather than returning a truncated event set', async () => {
    mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a><a href="/e/three">3</a>`,
      sitemap: '',
    })
    await expect(
      detailPageFetcher.fetch(makeVenue({ crawlDelayMs: 50 }), {
        crawlDelayMs: 50,
        overallTimeoutMs: 1,
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError)
  })

  it('caps how many detail pages one run will visit', async () => {
    const links = Array.from(
      { length: MAX_DETAIL_PAGES + 10 },
      (_, i) => `<a href="/e/show-${i}">${i}</a>`,
    ).join('')
    const fetchMock = mockSiteFetch({ listing: links, sitemap: '' })
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    // listing + MAX_DETAIL_PAGES detail pages (the sitemap 404s here).
    expect(pageRequests(fetchMock)).toHaveLength(MAX_DETAIL_PAGES + 2)
  })

  it('stops checking robots.txt once the cap is reached', async () => {
    const robots = await import('../robots.js')
    const spy = vi.spyOn(robots, 'isAllowed')
    const links = Array.from(
      { length: MAX_DETAIL_PAGES + 40 },
      (_, i) => `<a href="/e/show-${i}">${i}</a>`,
    ).join('')
    mockSiteFetch({ listing: links, sitemap: '' })
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 })
    // Listing + sitemap + exactly the capped detail pages — never the 40
    // candidates past the cap, which are pre-flight work we would throw away.
    expect(spy).toHaveBeenCalledTimes(MAX_DETAIL_PAGES + 2)
  })
})
