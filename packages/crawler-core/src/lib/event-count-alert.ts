// Detects "successful crawl, suspiciously few events" — the Bluebird gap
// from #624 where status: 'success' + eventsFound: 0 was being treated as
// healthy even though the venue normally has ~70 events on calendar. The
// 3-consecutive-failures path doesn't catch this because the HTTP fetch +
// extraction nominally succeed; only the count of extracted rows reveals
// the regression.

import { and, desc, eq, ne } from 'drizzle-orm'
import { db, crawlRuns, notifications, venues } from '@concert-crawl/db'
import { sendEventCountDropEmail } from './email.js'

// How many recent successful runs to average for the baseline. 7 days of
// daily crawls' worth — long enough to ride out a slow Tuesday but short
// enough that the baseline tracks recent venue programming.
export const BASELINE_RUN_COUNT = 7

// Below this number of successful historical runs, we don't have enough
// signal to call a "drop". New venues get a grace period.
export const COLD_START_MIN_RUNS = 3

// Soft alert threshold — if current run < baseline * 0.3, that's a
// meaningful drop. Tuned generously to avoid noise during initial
// rollout; can be tightened per-venue later if false positives appear.
export const SOFT_DROP_RATIO = 0.3

// Don't re-alert the same venue more than once per 7 days. Without this,
// every daily crawl after a regression would re-fire the alert until the
// venue is fixed — admin gets the signal once, then has 7 days to act.
export const ALERT_COOLDOWN_DAYS = 7

export interface EventCountAlertInput {
  venueId: string
  venueName: string
  crawlRunId: string
  eventsFound: number
  /** venues.last_event_count_alert_at as of the start of this run. */
  lastEventCountAlertAt: Date | null
  /** Override for tests; defaults to new Date(). */
  now?: Date
}

type AlertOutcome =
  | { fired: false; reason: 'cold_start' | 'cooldown' | 'no_drop' }
  | {
      fired: true
      severity: 'went_dark' | 'dropped_sharply'
      baselineCount: number
      dropPercent: number
    }

/**
 * Check whether the just-completed successful crawl looks suspicious and,
 * if so, insert an admin notification + send the alert email.
 *
 * Idempotent w.r.t. the cooldown: a second call inside the cooldown window
 * is a no-op even if the threshold logic would otherwise fire.
 *
 * Failures inside this function are swallowed — the crawl itself already
 * succeeded and we don't want to flip a healthy crawl_run into a failure
 * just because an alert insert hit a transient DB error. We log and move
 * on; #624 alerting is non-blocking.
 */
export async function checkEventCountDrop(
  input: EventCountAlertInput,
): Promise<AlertOutcome> {
  try {
    return await runCheck(input)
  } catch (err) {
    console.log(
      JSON.stringify({
        event: 'crawl.event_count_alert.error',
        venueId: input.venueId,
        crawlRunId: input.crawlRunId,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    return { fired: false, reason: 'no_drop' }
  }
}

async function runCheck(input: EventCountAlertInput): Promise<AlertOutcome> {
  const now = input.now ?? new Date()

  // Cooldown gate. Done before the baseline query so a venue in cooldown
  // doesn't pay for an unnecessary scan of crawl_runs.
  if (input.lastEventCountAlertAt) {
    const cooldownMs = ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    if (now.getTime() - input.lastEventCountAlertAt.getTime() < cooldownMs) {
      return { fired: false, reason: 'cooldown' }
    }
  }

  // Pull the last N successful (not skipped, not failed) runs to form
  // the baseline. Two filter notes:
  //   - Excluding 'skipped' matters because a page-hash dedup skip writes
  //     eventsFound: 0 by convention; counting those drags the baseline
  //     toward zero and masks real regressions.
  //   - Excluding the current run matters because the crawler inserts the
  //     crawl_runs row before calling this check, so without the filter
  //     a regression would partially shrink its own baseline.
  const recent = await db
    .select({ eventsFound: crawlRuns.eventsFound })
    .from(crawlRuns)
    .where(
      and(
        eq(crawlRuns.venueId, input.venueId),
        eq(crawlRuns.status, 'success'),
        ne(crawlRuns.id, input.crawlRunId),
      ),
    )
    .orderBy(desc(crawlRuns.createdAt))
    .limit(BASELINE_RUN_COUNT)

  if (recent.length < COLD_START_MIN_RUNS) {
    return { fired: false, reason: 'cold_start' }
  }

  const baselineCount =
    recent.reduce((sumSoFar, row) => sumSoFar + row.eventsFound, 0) /
    recent.length

  const severity = classifyDrop(input.eventsFound, baselineCount)
  if (!severity) {
    return { fired: false, reason: 'no_drop' }
  }

  const dropPercent =
    baselineCount > 0
      ? ((baselineCount - input.eventsFound) / baselineCount) * 100
      : 0

  // Insert notification + bump cooldown atomically. If the cooldown update
  // were a separate statement and failed transiently, the next crawl would
  // re-alert immediately because last_event_count_alert_at didn't get
  // written — duplicate notification + email for the same regression.
  await db.transaction(async (tx) => {
    await tx.insert(notifications).values({
      type: 'admin_alert',
      category: 'crawl.event_count_dropped',
      title:
        severity === 'went_dark'
          ? `Event count went dark: ${input.venueName}`
          : `Event count dropped sharply: ${input.venueName}`,
      body:
        severity === 'went_dark'
          ? `${input.venueName} returned 0 events on a successful crawl (baseline ~${baselineCount.toFixed(1)}).`
          : `${input.venueName} returned ${input.eventsFound} events (baseline ~${baselineCount.toFixed(1)}, ${dropPercent.toFixed(0)}% drop).`,
      metadata: JSON.stringify({
        venueId: input.venueId,
        crawlRunId: input.crawlRunId,
        eventsFound: input.eventsFound,
        baselineCount,
        dropPercent,
      }),
    })

    await tx
      .update(venues)
      .set({ lastEventCountAlertAt: now, updatedAt: now })
      .where(eq(venues.id, input.venueId))
  })

  // Fire-and-forget — same pattern as the crawl.failed path. Email failures
  // don't roll back the notification row (admin still sees it in the inbox).
  void sendEventCountDropEmail({
    venueName: input.venueName,
    venueId: input.venueId,
    crawlRunId: input.crawlRunId,
    eventsFound: input.eventsFound,
    baselineCount,
    dropPercent,
  }).catch((emailErr) => {
    console.log(
      JSON.stringify({
        event: 'crawl.event_count_alert.email_error',
        venueId: input.venueId,
        error: String(emailErr),
      }),
    )
  })

  return {
    fired: true,
    severity,
    baselineCount,
    dropPercent,
  }
}

function classifyDrop(
  eventsFound: number,
  baselineCount: number,
): 'went_dark' | 'dropped_sharply' | null {
  if (baselineCount <= 0) return null
  if (eventsFound === 0) return 'went_dark'
  if (eventsFound < baselineCount * SOFT_DROP_RATIO) return 'dropped_sharply'
  return null
}
