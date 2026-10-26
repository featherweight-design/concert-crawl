import { CRAWLER_USER_AGENT } from '@concert-crawl/types'

import { jitter } from './fetchers/jitter.js'
import {
  CrawlSkipError,
  getCrawlDelayMs,
  isAllowedOrSkip,
  resolveCrawlDelayMs,
} from './robots.js'

// The most redirect hops we follow, matching fetch's own limit.
const MAX_REDIRECTS = 20

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * robots.txt for a redirect target must allow it, and its Crawl-delay must
 * be one we can keep, before we follow. Waits that delay (never less than
 * `floorMs`), with jitter. Throws `CrawlSkipError` when robots.txt is
 * unreachable or asks for more than the cap, and a plain Error when it
 * disallows the target.
 */
export async function clearRedirect(
  from: string,
  to: string,
  floorMs: number,
): Promise<void> {
  if (!(await isAllowedOrSkip(to, CRAWLER_USER_AGENT))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    )
    throw new Error(`robots.txt disallows redirect target ${to} (from ${from})`)
  }
  const delayMs = resolveCrawlDelayMs(
    floorMs,
    await getCrawlDelayMs(to, CRAWLER_USER_AGENT),
    { url: to },
  )
  if (delayMs === null) {
    throw new CrawlSkipError(
      `robots.txt Crawl-delay for redirect target ${to} exceeds the cap; not followed`,
    )
  }
  const wait = jitter(delayMs)
  if (wait > 0) await sleep(wait)
}

export interface RobotsFetchResult {
  response: Response
  finalUrl: string
}

/**
 * GET `url`, following redirects by hand so each hop clears robots.txt and
 * its pacing before we request it (see `clearRedirect`). The caller has
 * already checked and paced the starting URL. `timeoutMs` applies to each
 * request on its own, so a hop's wait never eats into the next one's budget.
 */
export async function fetchFollowingRobots(
  url: string,
  options: {
    headers?: Record<string, string>
    crawlDelayMs: number
    timeoutMs?: number
  },
): Promise<RobotsFetchResult> {
  let currentUrl = url
  for (let hop = 0; ; hop++) {
    const response = await fetch(currentUrl, {
      headers: { 'User-Agent': CRAWLER_USER_AGENT, ...options.headers },
      redirect: 'manual',
      ...(options.timeoutMs === undefined
        ? {}
        : { signal: AbortSignal.timeout(options.timeoutMs) }),
    })
    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, finalUrl: currentUrl }
    }
    if (hop >= MAX_REDIRECTS) {
      throw new Error(`Too many redirects starting at ${url}`)
    }
    const next = new URL(location, currentUrl).toString()
    await clearRedirect(currentUrl, next, options.crawlDelayMs)
    currentUrl = next
  }
}
