// Detail-page-following platform adapter (#1295).
//
// Some venues publish a calendar index that carries no per-event structured
// data at all — the index is a wall of links, and the schema.org `Event`
// JSON-LD lives one hop away on each event's own detail page. The
// HTML → JSON-LD → LLM cascade never makes that hop: `crawlVenue()` fetches
// `venue.websiteUrl` once and extracts from that single document, so these
// venues look empty even though every field we need is published.
//
// The Black Box (Denver, ~250 cap) is the venue that motivated this. Its
// index at https://events.blackboxdenver.co/ emits only a `WebSite` JSON-LD
// block, while each /e/<slug> detail page emits exactly one `MusicEvent`
// with name, url, startDate (tz-offset-bearing), location and description.
//
// ⚠️ This adapter is deliberately a pure fetch + JSON-LD parse. It never
// calls the LLM extractor, and it must not be changed to. The Black Box's
// robots.txt names `ClaudeBot` / `Claude-Web` under a `Disallow: /` group
// and sets `DisallowAITraining: /`; it allows our own honest
// `ConcertCrawl/1.0` agent under `User-agent: *`. Routing these pages
// through Claude would put us on the wrong side of a rule the site states
// explicitly. Structured data, fetched as ourselves, is the only path here.

import type { Venue } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { NormalizedEvent } from '../../types.js'
import { extractJsonLd } from '../extractors/json-ld.js'
import { isAllowed } from '../robots.js'
import { createDeadline } from './deadline.js'
import type {
  PlatformFetcher,
  PlatformFetchOptions,
  PlatformFetchResult,
} from './index.js'

const logger = createLogger('detail-page-fetcher')
const USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

/**
 * Ceiling on how many detail pages one run will visit.
 *
 * The Black Box lists 35 upcoming events today, and a ~250-cap club running
 * four nights a week is at the busy end of what this adapter is for. 60
 * leaves ample headroom for a venue that books further out or adds a second
 * room, while still bounding a runaway link-discovery result — the failure
 * mode we care about is a heuristic that starts claiming every page on a
 * site, and a hard cap is what keeps that from becoming a hammering.
 */
export const MAX_DETAIL_PAGES = 60

/**
 * How many individual detail-page HTTP failures a run tolerates before it
 * gives up.
 *
 * Not zero: one 404 from a show pulled mid-crawl should not cost us the
 * other 34 events. Not unbounded either — crawl.ts's stale-event pass reads
 * a missing event as a show that was taken down, so a run that quietly
 * dropped half its pages would mark real upcoming shows missing. Three is
 * "a page or two moved", anything more is "the site changed or is sick".
 */
const MAX_DETAIL_FAILURES = 3

// File extensions that are never an event detail page. Cheap pre-filter so
// a stylesheet or favicon link never costs a request against the budget.
const NON_PAGE_EXTENSION =
  /\.(?:css|js|mjs|json|xml|txt|ico|png|jpe?g|gif|svg|webp|avif|pdf|zip|mp3|mp4|woff2?|ttf|eot)$/i

export class DetailPageFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = 'DetailPageFetchError'
  }
}

// Jitter the crawl delay (±500ms) so a long sequence of detail-page requests
// doesn't hit the venue on a bot-like fixed interval — mirrors VenuePilot,
// Live Nation and the cascade fetcher (lib/fetcher.ts).
function jitter(ms: number): number {
  // A venue that asks for no delay gets none — without this, jittering zero
  // would sometimes return up to 499ms and pace the admin probe.
  if (ms <= 0) return 0
  return Math.max(0, ms + Math.floor(Math.random() * 1000) - 500)
}

async function fetchText(url: string, timeoutMs?: number): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml',
    },
    // A hung connection must not pin the caller — the admin probe endpoint
    // holds an API worker slot while this resolves.
    ...(timeoutMs !== undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {}),
  })
  if (!response.ok) {
    throw new DetailPageFetchError(
      response.status,
      url,
      // The admin probe surfaces err.message only, so name the URL that
      // failed — otherwise a bad detail page is indistinguishable from a
      // bad site.
      `Detail-page fetch failed: HTTP ${response.status} for ${url}`,
    )
  }
  return response.text()
}

/**
 * Canonicalize a candidate URL for comparison + fetching.
 *
 * - resolves relative hrefs against the listing page
 * - drops anything not same-origin with the listing (the Black Box index
 *   links out to eventbrite.com and a CDN; following either would take us
 *   off the venue's own site, which is the one thing this adapter is
 *   allowed to read)
 * - drops the fragment and any query string, so `/e/x?utm=1#top` and `/e/x`
 *   are one candidate rather than three requests
 * - strips a trailing `/tickets` segment. Venues on this shape link the
 *   BUY step from the calendar while publishing the JSON-LD one level up on
 *   the event page itself.
 * - strips a trailing slash so `/e/x/` and `/e/x` dedupe
 *
 * Returns null when the href is unusable (unparseable, cross-origin,
 * non-http scheme such as `mailto:`/`tel:`, or an asset URL).
 */
export function normalizeCandidateUrl(
  href: string,
  listingUrl: string,
): string | null {
  let resolved: URL
  try {
    resolved = new URL(href, listingUrl)
  } catch (err) {
    logger.debug(
      { href, listingUrl, err },
      'detail-page: skipping an unparseable href',
    )
    return null
  }
  const listingOrigin = new URL(listingUrl).origin
  // Covers `mailto:`, `tel:`, `javascript:` and friends implicitly — none of
  // them produce an origin that can match the listing's.
  if (resolved.origin !== listingOrigin) return null
  if (NON_PAGE_EXTENSION.test(resolved.pathname)) return null

  let path = resolved.pathname.replace(/\/tickets\/?$/i, '')
  path = path.replace(/\/+$/, '')
  if (path === '') path = '/'
  return `${listingOrigin}${path}`
}

/**
 * Pull candidate detail-page URLs out of the listing HTML.
 *
 * Deliberately generic — every same-origin anchor is a candidate, with no
 * per-venue path pattern. A `/e/` rule would fit The Black Box and nothing
 * else, and per-venue selectors are a standing non-goal for this crawler.
 * The listing URL itself is excluded (it is the page we just read), and the
 * sitemap intersection in `fetch` plus MAX_DETAIL_PAGES bound what the
 * looseness can cost.
 */
export function extractCandidateUrls(
  html: string,
  listingUrl: string,
): string[] {
  const self = normalizeCandidateUrl(listingUrl, listingUrl)
  const seen = new Set<string>()
  const pattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi
  for (const match of html.matchAll(pattern)) {
    const url = normalizeCandidateUrl(match[1]!, listingUrl)
    if (url === null) continue
    if (url === self) continue
    seen.add(url)
  }
  return [...seen]
}

/**
 * Read the same-origin URLs a sitemap advertises, normalized the same way
 * as listing anchors so the two sets can be intersected.
 */
export function parseSitemapUrls(
  sitemapXml: string,
  listingUrl: string,
): Set<string> {
  const seen = new Set<string>()
  for (const match of sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const url = normalizeCandidateUrl(match[1]!, listingUrl)
    if (url !== null) seen.add(url)
  }
  return seen
}

async function detailPageFetch(
  venue: Venue,
  opts: PlatformFetchOptions,
): Promise<PlatformFetchResult> {
  const listingUrl = venue.websiteUrl
  const origin = new URL(listingUrl).origin
  const sitemapUrl = `${origin}/sitemap.xml`
  const startedAt = Date.now()
  const deadline = createDeadline(opts)

  // crawl.ts gates on venue.websiteUrl only, and robots.txt rules are
  // per-path — a site can allow the calendar index and disallow /e/. Every
  // URL we fetch clears the gate on its own. isAllowed() caches robots.txt
  // per domain, so this is one extra request for the whole run.
  if (!(await isAllowed(listingUrl, USER_AGENT))) {
    throw new DetailPageFetchError(
      0,
      listingUrl,
      `robots.txt disallows ${listingUrl}`,
    )
  }

  // The sitemap is an allowlist, not the discovery source. Reading it as the
  // source of candidates looked right until the live data was checked: The
  // Black Box's sitemap carries 74 URLs, and roughly half are events that
  // have already happened — following all of them would spend most of the
  // request budget re-reading the past. Intersecting it with the calendar's
  // own links keeps discovery scoped to what the venue is currently
  // advertising while guaranteeing we only ever request pages the site
  // itself publishes as crawlable.
  let sitemapUrls = new Set<string>()
  if (await isAllowed(sitemapUrl, USER_AGENT)) {
    try {
      sitemapUrls = parseSitemapUrls(
        await deadline.run('sitemap', (timeoutMs) =>
          fetchText(sitemapUrl, timeoutMs),
        ),
        listingUrl,
      )
    } catch (err) {
      // Optional by design — plenty of venues publish no sitemap, and a
      // missing one must not fail a run that the listing page alone can
      // serve. A budget breach is not optional, though: it means the whole
      // fetch is out of time, so let it propagate.
      if (err instanceof Error && err.name === 'PlatformFetchDeadlineError') {
        throw err
      }
      logger.debug(
        { venueId: venue.id, sitemapUrl, err },
        'detail-page: no usable sitemap, falling back to listing anchors',
      )
    }
  }

  await deadline.wait(jitter(opts.crawlDelayMs))
  const listingHtml = await deadline.run('listing', (timeoutMs) =>
    fetchText(listingUrl, timeoutMs),
  )
  const candidates = extractCandidateUrls(listingHtml, listingUrl)
  if (candidates.length === 0) {
    throw new DetailPageFetchError(
      0,
      listingUrl,
      `Detail-page listing ${listingUrl} contained no same-origin links to follow`,
    )
  }

  const inSitemap = candidates.filter((url) => sitemapUrls.has(url))
  // An empty intersection means the sitemap and the calendar disagree — a
  // stale or partial sitemap. Trusting it then would zero the run, so the
  // anchors win and the disagreement is logged.
  const allowlisted = inSitemap.length > 0 ? inSitemap : candidates
  if (sitemapUrls.size > 0 && inSitemap.length === 0) {
    logger.warn(
      { venueId: venue.id, sitemapUrl, candidateCount: candidates.length },
      'detail-page: sitemap matched none of the listing links — ignoring it',
    )
  }

  // Checked one at a time and stopped at the cap: a link-heavy listing can
  // yield hundreds of candidates, and only MAX_DETAIL_PAGES of them will ever
  // be fetched. Resolving robots.txt for the rest is wasted work and noise.
  const detailUrls: string[] = []
  let examinedCount = 0
  let robotsSkippedCount = 0
  for (const url of allowlisted) {
    if (detailUrls.length >= MAX_DETAIL_PAGES) break
    examinedCount++
    if (await isAllowed(url, USER_AGENT)) {
      detailUrls.push(url)
    } else {
      robotsSkippedCount++
    }
  }
  if (robotsSkippedCount > 0) {
    logger.warn(
      { venueId: venue.id, robotsSkippedCount, examinedCount, origin },
      'detail-page: robots.txt disallowed some detail pages — skipping them',
    )
  }

  const truncatedCount = allowlisted.length - examinedCount
  if (truncatedCount > 0) {
    // Worth an alert rather than a debug line: past the cap we are certainly
    // missing events, and the cap is the thing to revisit.
    logger.warn(
      { venueId: venue.id, origin, truncatedCount, cap: MAX_DETAIL_PAGES },
      'detail-page: more candidate pages than the per-run cap — truncating',
    )
  }

  const events: NormalizedEvent[] = []
  let pagesWithoutEvents = 0
  let failedPageCount = 0

  for (const detailUrl of detailUrls) {
    // Every detail page is a request to the venue's own domain, so the
    // venue's configured per-domain delay applies to each of them.
    await deadline.wait(jitter(opts.crawlDelayMs))
    let html: string
    try {
      html = await deadline.run(`detail ${detailUrl}`, (timeoutMs) =>
        fetchText(detailUrl, timeoutMs),
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'PlatformFetchDeadlineError') {
        throw err
      }
      failedPageCount++
      if (failedPageCount > MAX_DETAIL_FAILURES) {
        throw new DetailPageFetchError(
          err instanceof DetailPageFetchError ? err.httpStatus : 0,
          detailUrl,
          `Detail-page fetch gave up after ${failedPageCount} failed pages (last: ${
            err instanceof Error ? err.message : String(err)
          })`,
        )
      }
      logger.warn(
        { venueId: venue.id, detailUrl, failedPageCount, err },
        'detail-page: skipping a detail page that failed to fetch',
      )
      continue
    }

    // A page with no Event JSON-LD is simply not an event page. On a generic
    // link crawl that is expected (an about page, a FAQ), so it is counted,
    // not raised.
    const pageEvents = extractJsonLd(html, detailUrl, venue.timezone)
    if (pageEvents.length === 0) {
      pagesWithoutEvents++
      continue
    }
    events.push(...pageEvents)
  }

  return {
    events,
    sourceUrl: listingUrl,
    meta: {
      fetchLatencyMs: Date.now() - startedAt,
      candidateCount: candidates.length,
      sitemapUrlCount: sitemapUrls.size,
      sitemapMatchedCount: inSitemap.length,
      robotsSkippedCount,
      truncatedCount,
      detailPagesFetched: detailUrls.length - failedPageCount,
      pagesWithoutEvents,
      failedPageCount,
      eventsAfterNormalization: events.length,
    },
  }
}

export const detailPageFetcher: PlatformFetcher = {
  source: 'detail-page',
  // One sitemap read + one listing read + up to MAX_DETAIL_PAGES detail
  // pages. Callers size overallTimeoutMs from this, so it has to cover the
  // worst case rather than the Black Box's current 35.
  maxRequests: MAX_DETAIL_PAGES + 2,
  canHandle(venue) {
    return Boolean(
      venue.platform === 'detail-page' &&
      venue.websiteUrl &&
      venue.websiteUrl.length > 0,
    )
  },
  fetch: detailPageFetch,
}
