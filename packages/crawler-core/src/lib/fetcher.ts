import type { Browser } from 'playwright'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

import { jitter } from './fetchers/jitter.js'
import { isAllowedOrSkip } from './robots.js'

// The most redirect hops fetchPageHttp follows, matching fetch's own limit.
const MAX_REDIRECTS = 20

// robots.txt for wherever a redirect points must allow it before we follow.
// The starting URL is checked by the caller; this covers the hops after it.
// An unreachable robots.txt throws CrawlSkipError, like every other gate.
async function assertRedirectAllowed(from: string, to: string): Promise<void> {
  if (!(await isAllowedOrSkip(to, CRAWLER_USER_AGENT))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    )
    throw new Error(`robots.txt disallows redirect target ${to} (from ${from})`)
  }
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
    // first. Server redirects inside goto() never reach a route handler in
    // Playwright, so those are checked against the redirect chain below.
    await page.route('**/*', async (route) => {
      const request = route.request()
      if (
        !request.isNavigationRequest() ||
        request.frame() !== page.mainFrame() ||
        request.url() === url
      ) {
        await route.continue()
        return
      }
      const allowed = await isAllowedOrSkip(
        request.url(),
        CRAWLER_USER_AGENT,
      ).catch(() => false)
      if (allowed) {
        await route.continue()
      } else {
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
    const response = await page.goto(url, {
      waitUntil: waitForSelector ? 'domcontentloaded' : waitUntil,
      timeout: 60_000,
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
    for (const hop of [...hops, response?.url() ?? page.url()]) {
      if (hop !== url) await assertRedirectAllowed(url, hop)
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

  // Follow redirects by hand so robots.txt can veto each hop before we
  // request it, rather than learning where we went after the fact.
  let currentUrl = url
  let response: Response | undefined
  for (let hop = 0; ; hop++) {
    response = await fetch(currentUrl, {
      headers: {
        'User-Agent': CRAWLER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
    })
    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) break
    if (hop >= MAX_REDIRECTS) {
      throw new Error(`Too many redirects starting at ${url}`)
    }
    const next = new URL(location, currentUrl).toString()
    await assertRedirectAllowed(currentUrl, next)
    currentUrl = next
  }

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
  const finalUrl = currentUrl

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
