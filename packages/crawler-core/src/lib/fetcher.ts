import { chromium } from 'playwright'

const HONEST_USER_AGENT = 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'

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
  crawlDelayMs = 3000,
): Promise<FetchResult> {
  const delay = Math.max(0, jitter(crawlDelayMs))
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      userAgent: HONEST_USER_AGENT,
    })
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

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    const finalStatus = response?.status() ?? httpStatus

    if (finalStatus === 403 || finalStatus === 429) {
      console.log(
        JSON.stringify({ event: 'fetch.blocked', url, status: finalStatus }),
      )
      const error = new Error(
        `HTTP ${finalStatus} — venue may have blocked crawler`,
      )
      ;(error as NodeJS.ErrnoException).code = String(finalStatus)
      throw error
    }

    if (finalStatus >= 400) {
      console.log(
        JSON.stringify({ event: 'fetch.error', url, status: finalStatus }),
      )
      throw new Error(`HTTP ${finalStatus}`)
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
    await browser.close()
  }
}
