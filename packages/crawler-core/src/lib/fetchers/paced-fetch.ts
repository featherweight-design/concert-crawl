// What the adapters that follow redirects hop by hop (Live Nation and
// detail-page) share about handing a request to `fetchFollowingRobots`.

import type { ChainBudget, fetchFollowingRobots } from '../robots-fetch.js';
import { PlatformFetchDeadlineError } from './deadline.js';
import type { PlatformFetchOptions } from './index.js';

/** The adapter options that decide how one request's redirect chain is paced. */
export type Pacing = Pick<
  PlatformFetchOptions,
  'crawlDelayMs' | 'maxRedirects'
>;

type ChainOptions = Parameters<typeof fetchFollowingRobots>[1];

/**
 * The `fetchFollowingRobots` options for one paced page request, from the
 * adapter's pacing and what `deadline.run` handed the request.
 *
 * `timeoutMs` bounds each hop's network time on its own, so a hung
 * connection can't pin the caller (the admin probe holds an API worker slot
 * while this resolves). A hop's pacing wait is not network time: it counts
 * against `budget`, the deadline's budget for the whole chain, and never
 * against the per-request cap.
 */
export const pacedChainOptions = (
  { crawlDelayMs, maxRedirects }: Pacing,
  timeoutMs: number | undefined,
  budget: ChainBudget | undefined,
): ChainOptions => ({
  headers: { Accept: 'text/html,application/xhtml+xml,application/xml' },
  crawlDelayMs,
  ...(maxRedirects !== undefined ? { maxRedirects } : {}),
  ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  ...(budget !== undefined ? { budget } : {}),
});

/**
 * Whether a failed chain failed because the overall budget ran out: a hop's
 * pacing wait that could not fit, or the budget's signal ending a robots.txt
 * read or a request. That is a deadline breach (`deadline.run` relabels the
 * abort), not a failed page, so it is never recorded as a failed request.
 */
export const isBudgetBreach = (
  err: unknown,
  budget: ChainBudget | undefined,
): boolean =>
  err instanceof PlatformFetchDeadlineError || budget?.signal.aborted === true;
