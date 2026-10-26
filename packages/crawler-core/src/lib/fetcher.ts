import type { Browser } from 'playwright'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

import { jitter } from './fetchers/jitter.js'
import { CrawlSkipError, isAllowedOrSkip } from './robots.js'
import {
  RobotsDisallowedError,
  clearRedirect,
  fetchFollowingRobots,
} from './robots-fetch.js'

export { RobotsDisallowedError }

// A server redirect Playwright already followed: all we can still do is
// refuse to read a page whose chain passed through a disallowed URL.
async function assertVisitedAllowed(from: string, to: string): Promise<void> {
  if (!(await isAllowedOrSkip(to, CRAWLER_USER_AGENT))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    )
    throw new RobotsDisallowedError(to, from)
  }
}

function canonicalRequestUrl(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.href
}

export class CrawlFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'CrawlFetchError'
  }
}

// A selector timeout means the page loaded but never rendered what we expected.
// The HTML at that moment is the only evidence of why — a bot challenge, a geo
// redirect, a changed layout — and the throw would otherwise discard it.
export class CrawlSelectorTimeoutError extends Error {
  constructor(
    public readonly selector: string,
    public readonly html: string | null,
    public readonly finalUrl: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'CrawlSelectorTimeoutError'
  }
}

export interface FetchResult {
  html: string
  httpStatus: number
  finalUrl: string
}

export async function fetchPage(
  url: string,
  browser: Browser,
  crawlDelayMs = 3000,
  waitUntil: 'networkidle' | 'load' | 'domcontentloaded' = 'networkidle',
  waitForSelector?: string,
): Promise<FetchResult> {
  const delay = jitter(crawlDelayMs)
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  const context = await browser.newContext({
    userAgent: CRAWLER_USER_AGENT,
  })
  try {
    const page = await context.newPage()

    console.log(JSON.stringify({ event: 'fetch.start', url }))

    // A navigation the page starts itself (a script or meta refresh sending it
    // elsewhere) is a new request we choose to make, so it clears robots.txt
    // and its pacing first. Server redirects inside goto() never reach a
    // route handler in Playwright, so those are checked against the redirect
    // chain below. A skip (robots.txt unreachable, Crawl-delay over the cap)
    // is kept and rethrown, so the run records a skip rather than a failure.
    // Only the first request for `url` is goto()'s own; a reload or refresh
    // back to it later is a new request and goes through the gate too.
    // `url` as the browser reports it: `https://venue.example` comes back as
    // `https://venue.example/`, and the fragment is never sent.
    const startUrl = canonicalRequestUrl(url)
    let navigationSkip: CrawlSkipError | null = null
    let initialRequestSeen = false
    await page.route('**/*', async (route) => {
      const request = route.request()
      if (
        !request.isNavigationRequest() ||
        request.frame() !== page.mainFrame()
      ) {
        await route.continue()
        return
      }
      if (!initialRequestSeen && request.url() === startUrl) {
        initialRequestSeen = true
        await route.continue()
        return
      }
      try {
        await clearRedirect(page.url(), request.url(), crawlDelayMs)
        await route.continue()
      } catch (err) {
        if (err instanceof CrawlSkipError) navigationSkip = err
        console.log(
          JSON.stringify({
            event: 'fetch.navigation_disallowed',
            url,
            to: request.url(),
          }),
        )
        await route.abort('blockedbyclient')
      }
    })
    const throwIfSkipped = (): void => {
      if (navigationSkip) throw navigationSkip
    }

    // Every main-frame URL the page loaded, server redirect hops included
    // (Playwright emits a request for each). A navigation that cleared the
    // gate can still redirect somewhere disallowed, so the whole set is
    // checked before we read anything from the page.
    const visited = new Set<string>()
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        visited.add(request.url())
    })
    const assertVisitsAllowed = async (extra: string[] = []): Promise<void> => {
      throwIfSkipped()
      for (const hop of new Set([...visited, ...extra, page.url()])) {
        if (hop !== startUrl) await assertVisitedAllowed(url, hop)
      }
    }

    let httpStatus = 200
    page.on('response', (response) => {
      if (
        response.url() === page.url() ||
        response.request().isNavigationRequest()
      ) {
        httpStatus = response.status()
      }
    })

    // When a CSS selector is provided, use domcontentloaded for navigation
    // (fast connection) then let waitForSelector handle SPA render timing —
    // avoids networkidle/load timeouts on pages with persistent third-party requests.
    const response = await page
      .goto(url, {
        waitUntil: waitForSelector ? 'domcontentloaded' : waitUntil,
        timeout: 60_000,
      })
      .catch((err: unknown) => {
        throwIfSkipped()
        throw err
      })

    const finalStatus = response?.status() ?? httpStatus

    // Every hop of a server redirect, and where it landed, must be a URL
    // robots.txt lets us fetch. Playwright follows redirects before we can
    // intervene, so a disallowed hop means we discard the page unread.
    const hops: string[] = []
    for (
      let request = response?.request().redirectedFrom() ?? null;
      request;
      request = request.redirectedFrom()
    ) {
      hops.push(request.url())
    }

    if (finalStatus === 403 || finalStatus === 429) {
      console.log(
        JSON.stringify({ event: 'fetch.blocked', url, status: finalStatus }),
      )
      throw new CrawlFetchError(
        finalStatus,
        `HTTP ${finalStatus} — venue may have blocked crawler`,
      )
    }

    // After the block check: a 403/429 says the site blocked us, which must
    // mark the venue blocked whatever the redirect chain looked like.
    await assertVisitsAllowed([...hops, response?.url() ?? page.url()])

    if (finalStatus >= 400) {
      console.log(
        JSON.stringify({ event: 'fetch.error', url, status: finalStatus }),
      )
      throw new Error(`HTTP ${finalStatus}`)
    }

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 30_000 })
      } catch (err) {
        throwIfSkipped()
        // Only a genuine timeout means "loaded but never rendered". Other
        // failures here (invalid selector syntax, a closed page) are real
        // errors and must not be reclassified — blockedAt keys off this class.
        if (!(err instanceof Error) || err.name !== 'TimeoutError') {
          console.log(
            JSON.stringify({
              event: 'fetch.selector_error',
              url,
              selector: waitForSelector,
              error: err instanceof Error ? err.message : String(err),
            }),
          )
          throw err
        }

        // Reading content() can itself fail if the page died; a null html still
        // beats losing the whole error.
        await assertVisitsAllowed()
        const captured = await page.content().catch((contentErr: unknown) => {
          console.log(
            JSON.stringify({
              event: 'fetch.selector_timeout_capture_failed',
              url,
              error:
                contentErr instanceof Error
                  ? contentErr.message
                  : String(contentErr),
            }),
          )
          return null
        })
        console.log(
          JSON.stringify({
            event: 'fetch.selector_timeout',
            url,
            selector: waitForSelector,
            finalUrl: page.url(),
            httpStatus: finalStatus,
            htmlChars: captured?.length ?? 0,
          }),
        )
        // crawl_runs.errorMessage persists String(err), so the selector and
        // final URL have to live in the message or triage means log-combing.
        throw new CrawlSelectorTimeoutError(
          waitForSelector,
          captured,
          page.url(),
          finalStatus,
          `${err.message} (selector "${waitForSelector}" at ${page.url()}, HTTP ${finalStatus})`,
        )
      }
    }

    await assertVisitsAllowed()
    const html = await page.content()
    const finalUrl = page.url()

    console.log(
      JSON.stringify({
        event: 'fetch.success',
        url,
        finalUrl,
        status: finalStatus,
      }),
    )
    return { html, httpStatus: finalStatus, finalUrl }
  } finally {
    await context.close()
  }
}

export async function fetchPageHttp(
  url: string,
  crawlDelayMs = 3000,
): Promise<FetchResult> {
  const delay = jitter(crawlDelayMs)
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  console.log(JSON.stringify({ event: 'fetch.start', url, mode: 'http' }))

  // Redirects are followed by hand so robots.txt and its pacing clear each
  // hop before we request it, rather than learning where we went afterwards.
  const { response, finalUrl } = await fetchFollowingRobots(url, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    crawlDelayMs,
  })

  if (response.status === 403 || response.status === 429) {
    console.log(
      JSON.stringify({ event: 'fetch.blocked', url, status: response.status }),
    )
    throw new CrawlFetchError(
      response.status,
      `HTTP ${response.status} — venue may have blocked crawler`,
    )
  }

  if (response.status >= 400) {
    console.log(
      JSON.stringify({ event: 'fetch.error', url, status: response.status }),
    )
    throw new Error(`HTTP ${response.status}`)
  }

  const html = await response.text()

  console.log(
    JSON.stringify({
      event: 'fetch.success',
      url,
      finalUrl,
      status: response.status,
      mode: 'http',
    }),
  )
  return { html, httpStatus: response.status, finalUrl }
}
