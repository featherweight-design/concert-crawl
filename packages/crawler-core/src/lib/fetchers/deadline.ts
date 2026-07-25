// Wall-clock budgeting for platform fetchers (#1184).
//
// `timeoutMs` used to be a single per-request value, but every adapter makes
// many sequential requests — VenuePilot paginates up to MAX_PAGES, Live Nation
// reads a sitemap plus a calendar page per rolling month. Worst-case wall time
// was N × timeoutMs, so a caller asking for a 15s budget could wait minutes.

import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('platform-fetch-deadline')

/**
 * Raised when a platform fetch exhausts its overall wall-clock budget.
 *
 * Deliberately fatal rather than a signal to return early: the caller would
 * receive a truncated event set, and crawl.ts's stale-event pass reads a
 * missing event as a show that has been taken down, so a truncated fetch
 * would mark real upcoming shows missing.
 */
export class PlatformFetchDeadlineError extends Error {
  constructor(
    readonly overallTimeoutMs: number,
    readonly elapsedMs: number,
    readonly stage: string,
  ) {
    super(
      `Platform fetch exceeded its ${overallTimeoutMs}ms budget after ${elapsedMs}ms (at ${stage})`,
    )
    this.name = 'PlatformFetchDeadlineError'
  }
}

export interface FetchDeadline {
  /**
   * Issues one request against the budget. `stage` names the request for the
   * breach message (e.g. `sitemap`, `page-3`).
   */
  run<TResult>(
    stage: string,
    request: (timeoutMs: number | undefined) => Promise<TResult>,
  ): Promise<TResult>

  /**
   * Sleeps for the inter-request crawl delay, never past the remaining
   * budget. Politeness pacing is real wall-clock time, so an unbounded sleep
   * between requests would overshoot the overall deadline by up to a full
   * delay however tightly each request is capped. Returning early is safe:
   * the next `run` sees the spent budget and throws the breach itself.
   */
  wait(delayMs: number): Promise<void>
}

const ABORT_ERROR_NAMES = new Set(['TimeoutError', 'AbortError'])

export const createDeadline = ({
  perRequestTimeoutMs,
  overallTimeoutMs,
}: {
  perRequestTimeoutMs?: number
  overallTimeoutMs?: number
}): FetchDeadline => {
  const startedAt = Date.now()
  const elapsed = () => Date.now() - startedAt

  const breach = (stage: string): PlatformFetchDeadlineError | undefined => {
    if (overallTimeoutMs === undefined) return undefined
    const spent = elapsed()
    if (spent < overallTimeoutMs) return undefined
    return new PlatformFetchDeadlineError(overallTimeoutMs, spent, stage)
  }

  const nextTimeoutMs = (): number | undefined => {
    if (overallTimeoutMs === undefined) return perRequestTimeoutMs
    // Floored at zero: the caller checked the budget a moment ago, but time
    // moves between that check and this one, and `AbortSignal.timeout()`
    // throws on a negative delay. Zero aborts immediately, which `run` then
    // relabels as the deadline breach it actually is.
    const remaining = Math.max(0, overallTimeoutMs - elapsed())
    return perRequestTimeoutMs === undefined
      ? remaining
      : Math.min(perRequestTimeoutMs, remaining)
  }

  return {
    async wait(delayMs) {
      if (delayMs <= 0) return
      const capped =
        overallTimeoutMs === undefined
          ? delayMs
          : Math.min(delayMs, Math.max(0, overallTimeoutMs - elapsed()))
      if (capped <= 0) return
      await new Promise((resolve) => setTimeout(resolve, capped))
    },

    async run(stage, request) {
      const spentBefore = breach(stage)
      if (spentBefore) throw spentBefore

      try {
        return await request(nextTimeoutMs())
      } catch (err) {
        // An abort fired by the budget-derived signal surfaces as a generic
        // TimeoutError. Relabel only aborts — a real HTTP failure that lands
        // past the deadline should keep its own message.
        if (err instanceof Error && ABORT_ERROR_NAMES.has(err.name)) {
          const spentAfter = breach(stage)
          if (spentAfter) {
            // Relabelling is the one path that discards the original error,
            // so record what it was before swapping it for the breach.
            logger.debug(
              { stage, abortName: err.name, elapsedMs: spentAfter.elapsedMs },
              'platform fetch: abort relabelled as a deadline breach',
            )
            throw spentAfter
          }
        }
        throw err
      }
    },
  }
}
