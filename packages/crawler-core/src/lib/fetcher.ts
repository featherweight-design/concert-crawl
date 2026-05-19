import type { Browser } from 'playwright'

const HONEST_USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

export class CrawlFetchError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'CrawlFetchError'
  }
}

export interface FetchResult {
  html: string
  httpStatus: number
  finalUrl: string
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * 1000) - 500
}

export async function fetchPage(
  url: string,
  browser: Browser,
  crawlDelayMs = 3000,
  waitUntil: 'networkidle' | 'load' | 'domcontentloaded' = 'networkidle',
  waitForSelector?: string,
): Promise<FetchResult> {
  const delay = Math.max(0, jitter(crawlDelayMs))
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  const context = await browser.newContext({
    userAgent: HONEST_USER_AGENT,
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
      await page.waitForSelector(waitForSelector, { timeout: 30_000 })
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
  const delay = Math.max(0, jitter(crawlDelayMs))
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  console.log(JSON.stringify({ event: 'fetch.start', url, mode: 'http' }))

  const response = await fetch(url, {
    headers: {
      'User-Agent': HONEST_USER_AGENT,
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
