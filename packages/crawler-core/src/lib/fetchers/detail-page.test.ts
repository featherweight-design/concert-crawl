import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  CalendarNotFoundError,
  detailPageFetcher,
  DetailPageFetchError,
  extractCandidateUrls,
  normalizeCandidateUrl,
  parseSitemapUrls,
  MAX_DETAIL_PAGES,
} from './detail-page.js';
import { dispatch } from './dispatch.js';
import { PlatformFetchDeadlineError } from './deadline.js';
import type { Venue } from '@concert-crawl/db';
import { jitter } from './jitter.js';

// jitter() floors every wait at 3 s, so the real one would make each of the
// dozens of page requests here sleep 3-4 s. The floor is pinned by
// jitter.test.ts; tests here count the paced waits instead, except the few
// that switch the real one back in to time a wait on the fake clock.
vi.mock('./jitter.js', () => ({ jitter: vi.fn(() => 0) }));
const { jitter: realJitter } =
  await vi.importActual<typeof import('./jitter.js')>('./jitter.js');

/**
 * Put `AbortSignal.timeout` on the fake clock, so a request timeout and the
 * pacing waits it might cut short run on the same clock. Node's own timer
 * would never fire while fake time jumps ahead.
 */
function fakeClockTimeouts(): void {
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
    const controller = new AbortController();
    setTimeout(
      () =>
        controller.abort(
          new DOMException('The operation timed out.', 'TimeoutError'),
        ),
      ms,
    );
    return controller.signal;
  });
}

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);
function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

// Captured from https://events.blackboxdenver.co on 2026-08-03 with our own
// user agent, then stripped of <script>/<style>/comment noise (the JSON-LD
// block is preserved verbatim). Nothing on this path is ever sent to an LLM.
const LISTING_HTML = loadFixture('detail-page-blackbox-listing.html');
const DETAIL_HTML = loadFixture('detail-page-blackbox-event.html');
const SITEMAP_XML = loadFixture('detail-page-blackbox-sitemap.xml');

const LISTING_URL = 'https://events.blackboxdenver.co/';
const ORIGIN = 'https://events.blackboxdenver.co';

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
  } satisfies Venue;
}

interface SiteOverrides {
  robots?: string;
  sitemap?: string;
  listing?: string;
  detail?: (url: string) => {
    ok: boolean;
    status: number;
    body: string;
    /** Answer with a 302 to this URL instead of the body. */
    redirectTo?: string;
  };
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
    const asString = String(url);
    if (asString.endsWith('/robots.txt')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => overrides.robots ?? 'User-agent: *\nAllow: /\n',
      };
    }
    if (asString.endsWith('/sitemap.xml')) {
      const body = overrides.sitemap ?? SITEMAP_XML;
      if (body === '')
        return {
          ok: false,
          status: 404,
          headers: new Headers(),
          text: async () => '',
        };
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => body,
      };
    }
    if (asString === LISTING_URL || asString === ORIGIN) {
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => overrides.listing ?? LISTING_HTML,
      };
    }
    const detail = overrides.detail?.(asString);
    if (detail?.redirectTo) {
      return {
        ok: false,
        status: 302,
        headers: new Headers({ location: detail.redirectTo }),
        body: null,
        text: async () => '',
      };
    }
    if (detail) {
      return {
        ok: detail.ok,
        status: detail.status,
        headers: new Headers(),
        text: async () => detail.body,
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => DETAIL_HTML,
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * robots.txt is cached per origin for the module's lifetime, so the number
 * of robots requests in a run depends on test order. Assertions about how
 * much of the site we pulled count only the page requests.
 */
function pageRequests(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => !url.endsWith('/robots.txt'));
}

describe('detailPageFetcher.canHandle', () => {
  it('claims a venue with platform=detail-page', () => {
    expect(detailPageFetcher.canHandle(makeVenue())).toBe(true);
  });

  it('declines a venue on another platform', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ platform: 'aeg' }))).toBe(
      false,
    );
  });

  it('declines a venue with no platform set at all', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ platform: null }))).toBe(
      false,
    );
  });

  it('declines when the listing URL is missing, since websiteUrl IS the listing', () => {
    expect(detailPageFetcher.canHandle(makeVenue({ websiteUrl: '' }))).toBe(
      false,
    );
  });
});

describe('dispatch', () => {
  it('routes a detail-page venue to this fetcher', () => {
    expect(dispatch(makeVenue())).toBe(detailPageFetcher);
  });

  it('leaves a platformless venue on the cascade', () => {
    expect(dispatch(makeVenue({ platform: null }))).toBeNull();
  });
});

describe('normalizeCandidateUrl', () => {
  it('resolves a relative href against the listing', () => {
    expect(normalizeCandidateUrl('/e/joker-aug15', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    );
  });

  it('strips a trailing /tickets so the calendar link points at the JSON-LD page', () => {
    expect(normalizeCandidateUrl('/e/joker-aug15/tickets', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    );
    expect(normalizeCandidateUrl('/e/joker-aug15/tickets/', LISTING_URL)).toBe(
      `${ORIGIN}/e/joker-aug15`,
    );
  });

  it('collapses trailing slashes, query strings and fragments to one candidate', () => {
    const canonical = `${ORIGIN}/e/joker-aug15`;
    expect(normalizeCandidateUrl('/e/joker-aug15/', LISTING_URL)).toBe(
      canonical,
    );
    expect(normalizeCandidateUrl('/e/joker-aug15?utm=x', LISTING_URL)).toBe(
      canonical,
    );
    expect(normalizeCandidateUrl('/e/joker-aug15#lineup', LISTING_URL)).toBe(
      canonical,
    );
  });

  it('rejects cross-origin hrefs — the venue site is the only thing we may read', () => {
    expect(
      normalizeCandidateUrl('https://www.eventbrite.com/e/12345', LISTING_URL),
    ).toBeNull();
    expect(
      normalizeCandidateUrl('//www.eventbrite.com/e/12345', LISTING_URL),
    ).toBeNull();
    expect(
      normalizeCandidateUrl('http://events.blackboxdenver.co/e/x', LISTING_URL),
    ).toBeNull();
  });

  it('rejects non-http schemes and asset URLs', () => {
    expect(normalizeCandidateUrl('mailto:info@example.com', LISTING_URL)).toBe(
      null,
    );
    expect(normalizeCandidateUrl('tel:+13035551212', LISTING_URL)).toBeNull();
    expect(normalizeCandidateUrl('/assets/app.css', LISTING_URL)).toBeNull();
    expect(normalizeCandidateUrl('/img/logo.png', LISTING_URL)).toBeNull();
  });
});

describe('extractCandidateUrls', () => {
  it('pulls every event link out of the real Black Box listing', () => {
    const urls = extractCandidateUrls(LISTING_HTML, LISTING_URL);
    expect(urls).toContain(`${ORIGIN}/e/joker-aug15`);
    // Every /e/ candidate has had its /tickets suffix removed.
    expect(urls.filter((url) => url.endsWith('/tickets'))).toEqual([]);
    expect(urls.filter((url) => url.includes('/e/')).length).toBeGreaterThan(
      30,
    );
  });

  it('never returns a cross-origin URL, even when the listing links out', () => {
    const html = `
      <a href="/e/one/tickets">One</a>
      <a href="https://www.eventbrite.com/e/99999">Buy on Eventbrite</a>
      <a href="//cdn.example.com/logo.png">logo</a>
    `;
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([
      `${ORIGIN}/e/one`,
    ]);
  });

  it('dedupes links that normalize to the same page', () => {
    const html = `
      <a href="/e/one">One</a>
      <a href="/e/one/tickets">Tickets</a>
      <a href='/e/one/?utm_source=nav'>Again</a>
    `;
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([
      `${ORIGIN}/e/one`,
    ]);
  });

  it('excludes the listing URL itself', () => {
    const html = `<a href="/">Home</a><a href="${LISTING_URL}">Home again</a><a href="/e/one">One</a>`;
    expect(extractCandidateUrls(html, LISTING_URL)).toEqual([
      `${ORIGIN}/e/one`,
    ]);
  });
});

describe('parseSitemapUrls', () => {
  it('normalizes sitemap locs the same way as listing anchors', () => {
    const urls = parseSitemapUrls(SITEMAP_XML, LISTING_URL);
    expect(urls.has(`${ORIGIN}/e/hip-hop-summit-denver-sep5`)).toBe(true);
    // /e/x and /e/x/tickets both appear in the real sitemap and collapse.
    expect([...urls].some((url) => url.endsWith('/tickets'))).toBe(false);
  });
});

describe('detailPageFetcher.fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows each event link and maps its MusicEvent JSON-LD', async () => {
    const fetchMock = mockSiteFetch();
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    });

    const requested = pageRequests(fetchMock);
    expect(requested[0]).toBe(`${ORIGIN}/sitemap.xml`);
    expect(requested[1]).toBe(LISTING_URL);
    // The sitemap intersection keeps the non-event pages the listing links
    // to (the FAQ, in the real capture) out of the request set entirely.
    expect(requested.slice(2).every((url) => url.includes('/e/'))).toBe(true);
    expect(requested.every((url) => url.startsWith(ORIGIN))).toBe(true);
    expect(requested.length).toBeLessThanOrEqual(MAX_DETAIL_PAGES + 2);

    expect(result.sourceUrl).toBe(LISTING_URL);
    expect(result.events.length).toBe(requested.length - 2);

    const event = result.events[0]!;
    expect(event.title).toBe('Hip-Hop Summit Denver');
    expect(event.artist).toBe('Hip-Hop Summit Denver');
    // startDate is "2026-09-05T12:00:00-06:00" — the tz offset resolves to
    // the same civil date in America/Denver.
    expect(event.date).toBe('2026-09-05');
    expect(event.showTime).toBe('12:00:00');
    expect(event.sourceUrl).toMatch(/\/e\//);
    expect(event.ticketUrl).toBe(
      `${ORIGIN}/e/hip-hop-summit-denver-sep5/tickets`,
    );
    expect(event.confidence).toBe(1);
    // The description arrives entity-encoded (&nbsp;, &rsquo;) and comes out
    // decoded plain text.
    expect(event.description).toContain('Colorado’s premier');
    expect(event.description).not.toContain('&rsquo;');
    expect(event.description).not.toContain('&nbsp;');
  });

  it('requests the listing and one detail page when firstPageOnly is set', async () => {
    // The admin probe sets this. The listing carries no event data of its
    // own, so the probe follows one link and returns that page's events:
    // never more than one detail page.
    vi.mocked(jitter).mockClear();
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a><a href="/e/three">3</a>`,
      sitemap: '',
    });
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
      firstPageOnly: true,
    });

    // The sitemap read 404s here; listing plus exactly one detail page.
    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
      `${ORIGIN}/e/one`,
    ]);
    // The sitemap, listing and detail page are each paced through jitter,
    // which floors them at 3 s.
    expect(jitter).toHaveBeenCalledTimes(3);
    expect(result.sourceUrl).toBe(LISTING_URL);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.title).toBe('Hip-Hop Summit Denver');
    expect(result.meta?.truncatedCount).toBe(0);
  });

  it('skips a nav link for the event link further down when there is no sitemap', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/about">About</a><a href="/faq">FAQ</a><a href="/e/one">1</a>`,
      sitemap: '',
    });
    await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
      firstPageOnly: true,
    });

    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
      `${ORIGIN}/e/one`,
    ]);
  });

  it('follows the sitemap to the event link when the venue publishes one', async () => {
    // The sitemap vouches for /e/listed only, so the probe passes over both
    // the nav link and an unlisted event-shaped link ahead of it.
    const fetchMock = mockSiteFetch({
      listing: `<a href="/about">About</a><a href="/e/unlisted">0</a><a href="/e/listed">1</a>`,
      sitemap: `<urlset><url><loc>${ORIGIN}/e/listed</loc></url></urlset>`,
    });
    await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
      firstPageOnly: true,
    });

    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
      `${ORIGIN}/e/listed`,
    ]);
  });

  it('fetches no detail page when no link qualifies', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/about">About</a><a href="/faq">FAQ</a>`,
      sitemap: '',
    });
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
      firstPageOnly: true,
    });

    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
    ]);
    expect(result.events).toEqual([]);
  });

  it('fails a first-page-only fetch whose one detail page fails', async () => {
    // The probe reads a single detail page, so a failed one is the answer,
    // not a page to skip past with an ok and no events.
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a>`,
      sitemap: '',
      detail: () => ({ ok: false, status: 404, body: '' }),
    });
    await expect(
      detailPageFetcher.fetch(makeVenue(), {
        crawlDelayMs: 0,
        firstPageOnly: true,
      }),
    ).rejects.toThrow(DetailPageFetchError);
    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
      `${ORIGIN}/e/one`,
    ]);
  });

  it('still fails a first-page-only fetch whose listing has no links', async () => {
    const fetchMock = mockSiteFetch({
      listing: '<p>Nothing here</p>',
      sitemap: '',
    });
    await expect(
      detailPageFetcher.fetch(makeVenue(), {
        crawlDelayMs: 0,
        firstPageOnly: true,
      }),
    ).rejects.toBeInstanceOf(CalendarNotFoundError);
    expect(pageRequests(fetchMock)).toEqual([
      `${ORIGIN}/sitemap.xml`,
      LISTING_URL,
    ]);
  });

  it('never requests a cross-origin URL', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one/tickets">One</a><a href="https://www.eventbrite.com/e/9">Buy</a>`,
      sitemap: '',
    });
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 });
    expect(
      pageRequests(fetchMock).some((url) => url.includes('eventbrite')),
    ).toBe(false);
  });

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
          };
        }
        if (url.endsWith('/e/two')) {
          return {
            ok: true,
            status: 200,
            body: `<script type="application/ld+json">{"@context":"http://schema.org","@type":"WebSite","name":"The Black Box"}</script>`,
          };
        }
        return { ok: true, status: 200, body: DETAIL_HTML };
      },
    });
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    });
    // sitemap (404) + listing + 3 detail pages
    expect(pageRequests(fetchMock)).toHaveLength(5);
    expect(result.events).toHaveLength(1);
    expect(result.meta?.['pagesWithoutEvents']).toBe(2);
  });

  it('tolerates a handful of failed detail pages but gives up past the cap', async () => {
    mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a><a href="/e/three">3</a>`,
      sitemap: '',
      detail: (url) =>
        url.endsWith('/e/one')
          ? { ok: false, status: 404, body: '' }
          : { ok: true, status: 200, body: DETAIL_HTML },
    });
    const tolerated = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    });
    expect(tolerated.events).toHaveLength(2);
    expect(tolerated.meta?.['failedPageCount']).toBe(1);

    mockSiteFetch({
      listing: `<a href="/e/1">1</a><a href="/e/2">2</a><a href="/e/3">3</a><a href="/e/4">4</a><a href="/e/5">5</a>`,
      sitemap: '',
      detail: () => ({ ok: false, status: 500, body: '' }),
    });
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(DetailPageFetchError);
  });

  it('falls back to listing anchors when the site publishes no sitemap', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one/tickets">One</a>`,
      sitemap: '',
    });
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    });
    expect(pageRequests(fetchMock)).toContain(`${ORIGIN}/e/one`);
    expect(result.events).toHaveLength(1);
  });

  it('ignores a sitemap that matches none of the listing links rather than zeroing the run', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">One</a>`,
      sitemap: `<urlset><url><loc>${ORIGIN}/e/long-gone</loc></url></urlset>`,
    });
    const result = await detailPageFetcher.fetch(makeVenue(), {
      crawlDelayMs: 0,
    });
    expect(pageRequests(fetchMock)).toContain(`${ORIGIN}/e/one`);
    expect(pageRequests(fetchMock)).not.toContain(`${ORIGIN}/e/long-gone`);
    expect(result.events).toHaveLength(1);
  });

  it('throws when robots.txt disallows the listing', async () => {
    mockSiteFetch({ robots: 'User-agent: *\nDisallow: /\n' });
    await expect(
      detailPageFetcher.fetch(
        makeVenue({ websiteUrl: 'https://robots-blocked.example/' }),
        { crawlDelayMs: 0 },
      ),
    ).rejects.toThrow(DetailPageFetchError);
  });

  it('throws when the listing has nothing to follow', async () => {
    mockSiteFetch({ listing: '<html><body>Nothing here</body></html>' });
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(/no same-origin links/);
  });

  it('throws PlatformFetchDeadlineError rather than returning a truncated event set', async () => {
    mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a><a href="/e/three">3</a>`,
      sitemap: '',
    });
    await expect(
      detailPageFetcher.fetch(makeVenue({ crawlDelayMs: 50 }), {
        crawlDelayMs: 50,
        // 0, not 1: jitter() can return 0 for every wait, so a millisecond
        // budget can survive the whole mocked run and make this flaky.
        overallTimeoutMs: 0,
      }),
    ).rejects.toThrow(PlatformFetchDeadlineError);
  });

  it('caps how many detail pages one run will visit', async () => {
    const links = Array.from(
      { length: MAX_DETAIL_PAGES + 10 },
      (_, i) => `<a href="/e/show-${i}">${i}</a>`,
    ).join('');
    const fetchMock = mockSiteFetch({ listing: links, sitemap: '' });
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 });
    // listing + MAX_DETAIL_PAGES detail pages (the sitemap 404s here).
    expect(pageRequests(fetchMock)).toHaveLength(MAX_DETAIL_PAGES + 2);
  });

  it('aborts the whole run on the first 429 rather than tolerating it', async () => {
    const fetchMock = mockSiteFetch({
      listing: `<a href="/e/one">1</a><a href="/e/two">2</a>`,
      sitemap: '',
      detail: () => ({ ok: false, status: 429, body: '' }),
    });
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(DetailPageFetchError);
    // Sitemap (404s) + listing + the one blocked page. The second candidate
    // is never requested.
    expect(pageRequests(fetchMock)).toHaveLength(3);
  });

  it('refuses a detail page that redirects off-origin, without requesting it', async () => {
    const fetchMock = mockSiteFetch({
      listing: Array.from(
        { length: 5 },
        (_, i) => `<a href="/e/show-${i}">${i}</a>`,
      ).join(''),
      sitemap: '',
      detail: (url) => ({
        ok: true,
        status: 200,
        body: DETAIL_HTML,
        redirectTo: `https://evil.example${new URL(url).pathname}`,
      }),
    });
    await expect(
      detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 }),
    ).rejects.toThrow(/redirected off-origin/);
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('evil.example'),
      ),
    ).toBe(false);
  });

  it('records the URL a same-origin redirect landed on as the source', async () => {
    mockSiteFetch({
      listing: '<a href="/e/show-0">0</a>',
      sitemap: '',
      detail: (url) =>
        url.includes('/e/')
          ? {
              ok: true,
              status: 200,
              body: '',
              redirectTo: url.replace('/e/', '/events/'),
            }
          : { ok: true, status: 200, body: DETAIL_HTML },
    });
    const result = await detailPageFetcher.fetch(
      makeVenue({ websiteUrl: 'https://events.blackboxdenver.co/' }),
      { crawlDelayMs: 0 },
    );
    expect(result.events.length).toBeGreaterThan(0);
    for (const event of result.events) {
      expect(event.sourceUrl).toContain('/events/show-0');
    }
  });

  it('never requests a disallowed hop in the middle of a redirect chain', async () => {
    const fetchMock = mockSiteFetch({
      robots: 'User-agent: *\nDisallow: /private/\n',
      listing: '<a href="/e/show-0">0</a>',
      sitemap: '',
      detail: (url) =>
        url.includes('/e/')
          ? {
              ok: true,
              status: 200,
              body: '',
              redirectTo: url.replace('/e/', '/private/'),
            }
          : url.includes('/private/')
            ? {
                ok: true,
                status: 200,
                body: '',
                redirectTo: url.replace('/private/', '/events/'),
              }
            : { ok: true, status: 200, body: DETAIL_HTML },
    });
    await detailPageFetcher
      .fetch(makeVenue({ websiteUrl: 'https://mid-chain.example.com/' }), {
        crawlDelayMs: 0,
      })
      .catch(() => undefined);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/private/')),
    ).toBe(false);
  });

  it('stops checking robots.txt once the cap is reached', async () => {
    const robots = await import('../robots.js');
    const spy = vi.spyOn(robots, 'isAllowed');
    const links = Array.from(
      { length: MAX_DETAIL_PAGES + 40 },
      (_, i) => `<a href="/e/show-${i}">${i}</a>`,
    ).join('');
    mockSiteFetch({ listing: links, sitemap: '' });
    await detailPageFetcher.fetch(makeVenue(), { crawlDelayMs: 0 });
    // Sitemap + exactly the capped detail pages — never the 40 candidates
    // past the cap, which are pre-flight work we would throw away. (The
    // listing goes through isAllowedOrSkip, which this spy does not see.)
    expect(spy).toHaveBeenCalledTimes(MAX_DETAIL_PAGES + 1);
  });

  it('paces the sitemap read, its first request, at least 3 s after the start', async () => {
    // crawl.ts and the probe read robots.txt from this origin just before
    // dispatching here, so the first page request needs its own wait.
    vi.useFakeTimers();
    vi.mocked(jitter).mockImplementation(realJitter);
    try {
      const requestedAt: number[] = [];
      const fetchMock = mockSiteFetch({
        listing: '<a href="/e/one">1</a>',
        sitemap: '',
      });
      const base = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url: string) => {
        if (!String(url).endsWith('/robots.txt')) requestedAt.push(Date.now());
        return base?.(url);
      });
      const startedAt = Date.now();
      const run = detailPageFetcher.fetch(makeVenue(), {
        crawlDelayMs: 0,
        firstPageOnly: true,
      });
      await vi.advanceTimersByTimeAsync(20_000);
      await run;
      expect(pageRequests(fetchMock)[0]).toBe(`${ORIGIN}/sitemap.xml`);
      expect(requestedAt[0]! - startedAt).toBeGreaterThanOrEqual(3_000);
    } finally {
      vi.mocked(jitter).mockImplementation(() => 0);
      vi.useRealTimers();
    }
  });

  it("keeps a redirect hop's pacing wait out of the per-request timeout", async () => {
    // A 25 s wait before the hop is longer than the 20 s per-request cap.
    // The cap bounds each hop's network time only, so the hop goes out.
    vi.useFakeTimers();
    vi.mocked(jitter).mockImplementation(realJitter);
    fakeClockTimeouts();
    try {
      const fetchMock = mockSiteFetch({
        listing: '<a href="/e/one">1</a>',
        sitemap: '',
        detail: (url) =>
          url.includes('/e/')
            ? {
                ok: true,
                status: 200,
                body: '',
                redirectTo: url.replace('/e/', '/events/'),
              }
            : { ok: true, status: 200, body: DETAIL_HTML },
      });
      const run = detailPageFetcher.fetch(makeVenue(), {
        crawlDelayMs: 25_000,
        perRequestTimeoutMs: 20_000,
        firstPageOnly: true,
      });
      const settled = expect(run).resolves.toMatchObject({
        events: [expect.objectContaining({ title: 'Hip-Hop Summit Denver' })],
      });
      await vi.advanceTimersByTimeAsync(200_000);
      await settled;
      expect(pageRequests(fetchMock)).toContain(`${ORIGIN}/events/one`);
    } finally {
      vi.mocked(jitter).mockImplementation(() => 0);
      vi.useRealTimers();
    }
  });
});
