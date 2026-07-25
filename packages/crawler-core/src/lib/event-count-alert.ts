// Detects "successful crawl, suspiciously few events" — the Bluebird gap
// from #624 where status: 'success' + eventsFound: 0 was being treated as
// healthy even though the venue normally has ~70 events on calendar. The
// 3-consecutive-failures path doesn't catch this because the HTTP fetch +
// extraction nominally succeed; only the count of extracted rows reveals
// the regression.

import { and, desc, eq, gt, ne } from 'drizzle-orm'
import { db, crawlRuns, notifications, venues } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'
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

// Don't re-alert a venue that is *still* dark more than once per 7 days.
// Without this, every daily crawl after a regression would re-fire until the
// venue is fixed — admin gets the signal once, then has 7 days to act. The
// cooldown is cleared as soon as a healthy run lands (see runCheck), so a
// venue that recovers and then goes dark again alerts immediately rather than
// being silenced for the remainder of the window (#1174).
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
  | {
      fired: false
      reason: 'cold_start' | 'cooldown' | 'no_drop' | 'recovered'
    }
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
 * Idempotent w.r.t. the cooldown: a second dropped run inside the cooldown
 * window is a no-op even if the threshold logic would otherwise fire. A
 * healthy run clears the cooldown instead, so the window only ever suppresses
 * a venue that has stayed dark continuously.
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
    reportFailure({
      event: 'crawl.event_count_alert.error',
      severity: 'error',
      venueId: input.venueId,
      crawlRunId: input.crawlRunId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { fired: false, reason: 'no_drop' }
  }
}

async function runCheck(input: EventCountAlertInput): Promise<AlertOutcome> {
  const now = input.now ?? new Date()

  // Pull the last N successful runs that actually returned events, to form
  // the baseline. Three filter notes:
  //   - Excluding 'skipped' matters because a page-hash dedup skip writes
  //     eventsFound: 0 by convention; counting those drags the baseline
  //     toward zero and masks real regressions.
  //   - Excluding the current run matters because the crawler inserts the
  //     crawl_runs row before calling this check, so without the filter
  //     a regression would partially shrink its own baseline.
  //   - Excluding zero-event successful runs (#645) so the baseline reflects
  //     the venue's healthy throughput, not an average that's already been
  //     dragged down by prior silent failures. Before this filter a venue
  //     in the Bluebird-style "intermittently returns 0" mode would have a
  //     misleadingly low baseline (e.g. 3.4 instead of the real ~25), and
  //     the alert email would understate the regression. The alert still
  //     fires correctly in either case — the threshold ratios held — but
  //     the operator-facing copy was wrong.
  const recent = await db
    .select({ eventsFound: crawlRuns.eventsFound })
    .from(crawlRuns)
    .where(
      and(
        eq(crawlRuns.venueId, input.venueId),
        eq(crawlRuns.status, 'success'),
        ne(crawlRuns.id, input.crawlRunId),
        gt(crawlRuns.eventsFound, 0),
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
    // A healthy run ends the incident, so drop the cooldown marker. Red Rocks
    // (#1174) went dark six nights running; the alert fired on night one and
    // every later night returned 'cooldown', including the nights that
    // followed a recovery. Clearing here means the next darkening re-alerts.
    if (input.lastEventCountAlertAt) {
      // Compare-and-set against the snapshot this run started with. The admin
      // trigger-crawl path can overlap the nightly cron for one venue, and an
      // unconditional clear would let a healthy run wipe a marker a concurrent
      // dropped run had just written — reopening alerting for a venue that is
      // still dark.
      const cleared = await db
        .update(venues)
        .set({ lastEventCountAlertAt: null, updatedAt: now })
        .where(
          and(
            eq(venues.id, input.venueId),
            eq(venues.lastEventCountAlertAt, input.lastEventCountAlertAt),
          ),
        )
        .returning({ id: venues.id })
      // Zero rows means the CAS lost — a newer marker landed while this run
      // was in flight, so the cooldown stands and nothing recovered.
      return {
        fired: false,
        reason: cleared.length > 0 ? 'recovered' : 'no_drop',
      }
    }
    return { fired: false, reason: 'no_drop' }
  }

  // Cooldown gate. Only reached when this run is itself a drop, so it
  // throttles a venue that *stays* dark without ever muting a recurrence.
  if (input.lastEventCountAlertAt) {
    const cooldownMs = ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    if (now.getTime() - input.lastEventCountAlertAt.getTime() < cooldownMs) {
      return { fired: false, reason: 'cooldown' }
    }
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
        // severity threads through to the admin Crawl History badge so the
        // UI can label the row "Went dark" vs "Dropped sharply" without
        // re-classifying off raw eventsFound + baseline (#804).
        severity,
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

  // Await the email send. The crawler runs as a Render cron that hard-exits
  // via process.exit(0) the moment main() resolves; a fire-and-forget Promise
  // here gets severed mid-flight before the HTTP request to Resend completes,
  // so every alert email since PR #51 was silently dropped (#649). Email
  // failures still don't roll back the notification row above — the admin
  // notification inbox remains the authoritative signal, the email is the
  // secondary delivery channel.
  try {
    await sendEventCountDropEmail({
      venueName: input.venueName,
      venueId: input.venueId,
      crawlRunId: input.crawlRunId,
      eventsFound: input.eventsFound,
      baselineCount,
      dropPercent,
    })
  } catch (emailErr) {
    reportFailure({
      event: 'crawl.event_count_alert.email_error',
      severity: 'error',
      venueId: input.venueId,
      error: String(emailErr),
    })
  }

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
