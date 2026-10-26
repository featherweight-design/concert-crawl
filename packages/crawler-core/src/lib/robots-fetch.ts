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

// Rejects with the signal's reason if it aborts first, so a caller's budget
// bounds the pacing wait as well as the requests around it.
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

// Settles with `promise`, or rejects with the signal's reason if it aborts
// first. The robots.txt lookup underneath keeps running and caches whatever
// the site answers, so a caller's deadline never gets cached as a site
// failure; the caller just stops waiting for it.
const raceSignal = <TResult>(
  promise: Promise<TResult>,
  signal?: AbortSignal,
): Promise<TResult> => {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<TResult>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

/** robots.txt disallows a URL a redirect or navigation pointed us to. */
export class RobotsDisallowedError extends Error {
  constructor(
    public readonly url: string,
    from: string,
  ) {
    super(`robots.txt disallows redirect target ${url} (from ${from})`)
    this.name = 'RobotsDisallowedError'
  }
}

/**
 * robots.txt for a redirect target must allow it, and its Crawl-delay must
 * be one we can keep, before we follow. Waits that delay (never less than
 * `floorMs`), with jitter. Throws `CrawlSkipError` when robots.txt is
 * unreachable or asks for more than the cap, and `RobotsDisallowedError`
 * when it disallows the target. An aborted `signal` ends the robots.txt
 * lookups and the wait early with its reason.
 */
export async function clearRedirect(
  from: string,
  to: string,
  floorMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (!(await raceSignal(isAllowedOrSkip(to, CRAWLER_USER_AGENT), signal))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    )
    throw new RobotsDisallowedError(to, from)
  }
  const delayMs = resolveCrawlDelayMs(
    floorMs,
    await raceSignal(getCrawlDelayMs(to, CRAWLER_USER_AGENT), signal),
    { url: to },
  )
  if (delayMs === null) {
    throw new CrawlSkipError(
      `robots.txt Crawl-delay for redirect target ${to} exceeds the cap; not followed`,
    )
  }
  const wait = jitter(delayMs)
  if (wait > 0) await sleep(wait, signal)
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
 * `signal` instead bounds the whole chain, waits included: pass it when the
 * caller has one budget for the request however many hops it takes.
 */
export async function fetchFollowingRobots(
  url: string,
  options: {
    headers?: Record<string, string>
    crawlDelayMs: number
    timeoutMs?: number
    signal?: AbortSignal
  },
): Promise<RobotsFetchResult> {
  let currentUrl = url
  for (let hop = 0; ; hop++) {
    options.signal?.throwIfAborted()
    const signals = [
      ...(options.signal ? [options.signal] : []),
      ...(options.timeoutMs === undefined
        ? []
        : [AbortSignal.timeout(options.timeoutMs)]),
    ]
    const response = await fetch(currentUrl, {
      headers: { 'User-Agent': CRAWLER_USER_AGENT, ...options.headers },
      redirect: 'manual',
      ...(signals.length === 0 ? {} : { signal: AbortSignal.any(signals) }),
    })
    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, finalUrl: currentUrl }
    }
    // We never read a redirect's body; release its connection now rather
    // than hold it through the robots check and the wait below.
    await response.body?.cancel().catch(() => undefined)
    if (hop >= MAX_REDIRECTS) {
      throw new Error(`Too many redirects starting at ${url}`)
    }
    const next = new URL(location, currentUrl).toString()
    await clearRedirect(currentUrl, next, options.crawlDelayMs, options.signal)
    currentUrl = next
  }
}
