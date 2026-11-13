// The admin platform probe's timing: its per-request cap, its redirect cap,
// and the whole-probe budget sized from both (#1184).

import {
  PROBE_REQUESTS,
  type PlatformSource,
} from '@concert-crawl/crawler-core/fetchers';
import { MIN_CRAWL_DELAY_MS } from '@concert-crawl/types';

// A hung platform CDN connection must not pin an API worker slot — the
// probe aborts and reports fetch_error after this window. It caps each
// request, and is each request's network allowance in the whole-probe
// budget below.
export const PROBE_TIMEOUT_MS = 15_000;

// The most redirect hops one probe request may follow, handed to the adapter
// as `maxRedirects`; a 4th redirect fails the probe as a fetch_error. The
// crawl keeps fetch's own 20. Every hop costs a full pacing wait and a
// request of its own, so the cap is what keeps the budget below finite in
// practice. Three is enough for http→https→www→path.
export const MAX_PROBE_REDIRECT_HOPS = 3;

const isProbedSource = (source: string | undefined): source is PlatformSource =>
  source !== undefined && Object.hasOwn(PROBE_REQUESTS, source);

/**
 * The probe's whole budget, sized from the delay because a pacing wait is
 * never cut short (it breaches instead), so a fixed 15 s would fail any venue
 * whose site asks for a long Crawl-delay. Each adapter declares its own
 * request profile in crawler-core (`PROBE_REQUESTS`):
 *
 *   wait      = max(delay, MIN_CRAWL_DELAY_MS) + 1000   (a full second of jitter)
 *   requests  = paced × (1 + (followsRedirects ? MAX_PROBE_REDIRECT_HOPS : 0))
 *   budget    = requests × (wait + PROBE_TIMEOUT_MS)
 *
 * Every paced request waits once before it goes out, and every redirect hop
 * it may follow waits again before the hop is requested. Each of those
 * requests, hop or not, also gets its own full PROBE_TIMEOUT_MS of network
 * time, since that is the cap each one runs under; a hop's robots.txt read
 * runs under the same cap and is usually a cache hit.
 *
 * Worst case at the 3 s floor (wait = 4 s, so 19 s per request), every
 * request redirecting the full 3 times: AEG and VenuePilot 1 × 19 = 19 s,
 * Live Nation 2 × 4 × 19 = 152 s, detail-page 3 × 4 × 19 = 228 s. A longer
 * Crawl-delay scales the waits with it.
 *
 * Throws on a source with no profile rather than returning NaN, which an
 * adapter would read as a budget that is already spent, or never ends.
 */
export function probeBudgetMs(
  // Wider than PlatformSource on purpose: it is checked here at runtime, so
  // a fetcher that reaches the probe without a known source fails loud.
  source: string | undefined,
  crawlDelayMs: number,
): number {
  if (!isProbedSource(source)) {
    throw new Error(
      `No probe request profile for platform source "${String(source)}"`,
    );
  }
  const { paced, followsRedirects } = PROBE_REQUESTS[source];
  const waitMs = Math.max(crawlDelayMs, MIN_CRAWL_DELAY_MS) + 1_000;
  const requests =
    paced * (1 + (followsRedirects ? MAX_PROBE_REDIRECT_HOPS : 0));
  const budgetMs = requests * (waitMs + PROBE_TIMEOUT_MS);
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error(
      `Probe budget for "${source}" at a ${crawlDelayMs}ms delay is not a positive finite number`,
    );
  }
  return budgetMs;
}
