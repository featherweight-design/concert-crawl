import type { Browser } from 'playwright'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

import { jitter } from './fetchers/jitter.js'

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

  const response = await fetch(url, {
    headers: {
      'User-Agent': CRAWLER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
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
  const finalUrl = response.url

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
