import { CRAWLER_USER_AGENT } from '@concert-crawl/types';

import { jitter } from './fetchers/jitter.js';
import {
  CrawlSkipError,
  getCrawlDelayMs,
  isAllowedOrSkip,
  resolveCrawlDelayMs,
} from './robots.js';

// The most redirect hops we follow by default, matching fetch's own limit.
// A caller with a tight budget (the admin probe) passes a lower `maxRedirects`.
const MAX_REDIRECTS = 20;

// Rejects with the signal's reason if it aborts first, so a caller's budget
// bounds the pacing wait as well as the requests around it.
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

// Settles with `promise`, or rejects with the signal's reason if it aborts
// first. The robots.txt lookup underneath keeps running and caches whatever
// the site answers, so a caller's deadline never gets cached as a site
// failure; the caller just stops waiting for it.
export const raceSignal = <TResult>(
  promise: Promise<TResult>,
  signal?: AbortSignal,
): Promise<TResult> => {
  if (!signal) return promise;
  // Handled here whatever happens next: once we stop waiting, a later
  // rejection (an unreachable robots.txt's CrawlSkipError, say) must not
  // surface as an unhandled rejection that takes the process down.
  promise.catch(() => undefined);
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<TResult>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
};

/**
 * The overall budget a redirect chain runs inside, handed over by the
 * caller's deadline (see `FetchDeadline.run`).
 */
export interface ChainBudget {
  /** Aborts when the overall budget runs out. */
  signal: AbortSignal;
  /** The budget left right now, in ms; never negative. */
  remainingMs(): number;
  /**
   * A pacing wait against the budget. It is never cut short: when the
   * remaining budget can't hold the whole wait, it throws up front (a
   * deadline breach) and nothing is requested.
   */
  wait(delayMs: number): Promise<void>;
}

/**
 * The signal one request (a hop, or a hop's robots.txt read) runs under: the
 * budget's own signal, plus the per-request cap when that ends first. Read
 * from the live remaining budget, so a hop late in a chain is never handed a
 * timeout computed when the chain started. When the remaining budget is the
 * shorter of the two, the budget's signal alone ends the request at that
 * moment, so an abort there is always read as the budget's.
 */
export const hopSignal = (
  timeoutMs: number | undefined,
  budget: ChainBudget | undefined,
): AbortSignal | undefined => {
  const capBinds =
    timeoutMs !== undefined &&
    (budget === undefined || timeoutMs < budget.remainingMs());
  const signals = [
    ...(budget ? [budget.signal] : []),
    ...(capBinds ? [AbortSignal.timeout(timeoutMs)] : []),
  ];
  if (signals.length === 0) return undefined;
  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
};

/** robots.txt disallows a URL a redirect or navigation pointed us to. */
export class RobotsDisallowedError extends Error {
  constructor(
    public readonly url: string,
    from: string,
  ) {
    super(`robots.txt disallows redirect target ${url} (from ${from})`);
    this.name = 'RobotsDisallowedError';
  }
}

/**
 * robots.txt for a redirect target must allow it, and its Crawl-delay must
 * be one we can keep, before we follow. Waits that delay (never less than
 * `floorMs`), with jitter. Throws `CrawlSkipError` when robots.txt is
 * unreachable or asks for more than the cap, and `RobotsDisallowedError`
 * when it disallows the target. An aborted `signal` ends the robots.txt
 * lookups and the wait early with its reason.
 *
 * `wait`, when given, takes the pacing wait in place of a plain sleep: a
 * deadline's wait, which throws up front when the budget can't hold the
 * whole wait rather than sleeping into it and failing at the end.
 */
export async function clearRedirect(
  from: string,
  to: string,
  floorMs: number,
  signal?: AbortSignal,
  wait?: (delayMs: number) => Promise<void>,
): Promise<void> {
  signal?.throwIfAborted();
  if (!(await raceSignal(isAllowedOrSkip(to, CRAWLER_USER_AGENT), signal))) {
    console.log(
      JSON.stringify({ event: 'fetch.redirect_disallowed', from, to }),
    );
    throw new RobotsDisallowedError(to, from);
  }
  const delayMs = resolveCrawlDelayMs(
    floorMs,
    await raceSignal(getCrawlDelayMs(to, CRAWLER_USER_AGENT), signal),
    { url: to },
  );
  if (delayMs === null) {
    throw new CrawlSkipError(
      `robots.txt Crawl-delay for redirect target ${to} exceeds the cap; not followed`,
      'robots_crawl_delay',
    );
  }
  // jitter() floors every wait at 3 s, so there is always a wait to take.
  if (wait) {
    // `signal` is not consulted here: it may carry a per-request cap, which
    // bounds network time and never a pacing wait. `wait` checks the budget.
    await wait(jitter(delayMs));
  } else {
    await sleep(jitter(delayMs), signal);
  }
}

export interface RobotsFetchResult {
  response: Response;
  finalUrl: string;
}

/**
 * GET `url`, following redirects by hand so each hop clears robots.txt and
 * its pacing before we request it (see `clearRedirect`). The caller has
 * already checked and paced the starting URL. `timeoutMs` applies to each
 * request on its own, so a hop's wait never eats into the next one's budget.
 * `budget` instead bounds the whole chain, waits included: pass it when the
 * caller has one budget for the request however many hops it takes. Each
 * hop's request and its robots.txt reads then run under the shorter of
 * `timeoutMs` and the budget left at that moment, and each hop's pacing
 * wait goes through `budget.wait`, which breaches up front when the budget
 * can't hold it.
 */
export async function fetchFollowingRobots(
  url: string,
  options: {
    headers?: Record<string, string>;
    crawlDelayMs: number;
    timeoutMs?: number;
    budget?: ChainBudget;
    /** The most hops to follow; defaults to MAX_REDIRECTS. */
    maxRedirects?: number;
    /** Runs before each hop is cleared; throw to refuse the redirect. */
    onRedirect?: (from: string, to: string) => void;
  },
): Promise<RobotsFetchResult> {
  const { budget, timeoutMs } = options;
  let currentUrl = url;
  for (let hop = 0; ; hop++) {
    budget?.signal.throwIfAborted();
    const signal = hopSignal(timeoutMs, budget);
    const response = await fetch(currentUrl, {
      headers: { 'User-Agent': CRAWLER_USER_AGENT, ...options.headers },
      redirect: 'manual',
      ...(signal === undefined ? {} : { signal }),
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, finalUrl: currentUrl };
    }
    // We never read a redirect's body; release its connection now rather
    // than hold it through the robots check and the wait below.
    await response.body?.cancel().catch(() => undefined);
    if (hop >= (options.maxRedirects ?? MAX_REDIRECTS)) {
      throw new Error(`Too many redirects starting at ${url}`);
    }
    const next = new URL(location, currentUrl).toString();
    options.onRedirect?.(currentUrl, next);
    // With a budget, the hop's robots.txt reads count against it like the
    // hop itself (the same live signal, read now rather than at the chain's
    // start) and its pacing wait is the budget's own. Without one, the wait
    // is a plain sleep that no per-request cap may cut short.
    if (budget) {
      await clearRedirect(
        currentUrl,
        next,
        options.crawlDelayMs,
        hopSignal(timeoutMs, budget),
        budget.wait,
      );
    } else {
      await clearRedirect(currentUrl, next, options.crawlDelayMs);
    }
    currentUrl = next;
  }
}
