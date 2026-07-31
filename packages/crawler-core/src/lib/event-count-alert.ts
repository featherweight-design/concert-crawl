// Detects "the crawl didn't fail, but it learned nothing" — the Bluebird gap
// from #624, where a run that fetched and parsed fine but came away with 0
// events was treated as healthy even though the venue normally has ~70 shows
// on calendar. The 3-consecutive-failures path doesn't catch this because
// nothing hard-failed; only the count of usable rows reveals the regression.
//
// Runs regardless of the crawl_runs status the caller recorded: since #1165 a
// zero-usable run is written as 'partial' rather than 'success', and both need
// this check.

import { and, desc, eq, gt, ne } from 'drizzle-orm'
import { db, crawlRuns, notifications, venues } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'
import { sendEventCountDropEmail } from './email.js'
import {
  BASELINE_RUN_COUNT,
  evaluateEventCountCondition,
} from './triage-conditions.js'

// Thresholds and the classifier itself live in triage-conditions.ts so the
// admin triage read path (#1215) and this write path can never drift. Kept as
// re-exports here for the existing import sites.
export {
  BASELINE_RUN_COUNT,
  COLD_START_MIN_RUNS,
  SOFT_DROP_RATIO,
} from './triage-conditions.js'

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
  /** Raw extractor output. Reported for context; does not classify the drop. */
  eventsFound: number
  /**
   * Rows that survived the downstream cross-venue presale filter and empty
   * canonical artist/title guards. Classification and the baseline key off
   * this (#1167) — a run that extracted 10 rows and kept none learned as
   * little as one that extracted zero.
   */
  eventsUsable: number
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
 * Check whether the just-completed non-failed crawl looks suspicious and,
 * if so, insert an admin notification + send the alert email.
 *
 * Idempotent w.r.t. the cooldown: a second dropped run inside the cooldown
 * window is a no-op even if the threshold logic would otherwise fire. A
 * healthy run clears the cooldown instead, so the window only ever suppresses
 * a venue that has stayed dark continuously.
 *
 * Failures inside this function are swallowed — the crawl itself already
 * completed and we don't want to flip its crawl_run into a failure just
 * because an alert insert hit a transient DB error. We log and move on;
 * #624 alerting is non-blocking.
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
  //   - Averaging events_usable rather than events_found (#1167) so the
  //     baseline is denominated in the same unit as the current run's count.
  //     Migration 0059 backfilled events_usable = events_found, so every
  //     historical row is unchanged under the new semantics and no venue's
  //     baseline shifts on deploy.
  const recent = await db
    .select({ eventsUsable: crawlRuns.eventsUsable })
    .from(crawlRuns)
    .where(
      and(
        eq(crawlRuns.venueId, input.venueId),
        eq(crawlRuns.status, 'success'),
        ne(crawlRuns.id, input.crawlRunId),
        gt(crawlRuns.eventsUsable, 0),
      ),
    )
    .orderBy(desc(crawlRuns.createdAt))
    .limit(BASELINE_RUN_COUNT)

  const condition = evaluateEventCountCondition({
    eventsUsable: input.eventsUsable,
    baselineUsableCounts: recent.map((row) => row.eventsUsable),
  })

  if (!condition.detected && condition.reason === 'cold_start') {
    return { fired: false, reason: 'cold_start' }
  }

  if (!condition.detected) {
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

  const { condition: severity, baselineCount, dropPercent } = condition

  // When extraction produced rows but the downstream guards ate them all,
  // that's a different failure than a page returning nothing — the fetch and
  // parse worked, so the operator should look at the presale filter and the
  // canonical artist/title guards rather than at the venue's markup. Surfaced
  // in the notification body and the email.
  const guardsAteEverything = input.eventsUsable === 0 && input.eventsFound > 0

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
          ? guardsAteEverything
            ? `${input.venueName} extracted ${input.eventsFound} events on the latest crawl but none survived the cross-venue presale filter or the empty canonical artist/title guards (baseline ~${baselineCount.toFixed(1)} usable).`
            : `${input.venueName} returned 0 usable events on the latest crawl (baseline ~${baselineCount.toFixed(1)}).`
          : `${input.venueName} returned ${input.eventsUsable} usable events (baseline ~${baselineCount.toFixed(1)}, ${dropPercent.toFixed(0)}% drop).`,
      metadata: JSON.stringify({
        venueId: input.venueId,
        crawlRunId: input.crawlRunId,
        // severity threads through to the admin Crawl History badge so the
        // UI can label the row "Went dark" vs "Dropped sharply" without
        // re-classifying off raw counts + baseline (#804).
        severity,
        eventsFound: input.eventsFound,
        eventsUsable: input.eventsUsable,
        baselineCount,
        dropPercent,
      }),
    })

    await tx
      .update(venues)
      .set({ lastEventCountAlertAt: now, updatedAt: now })
      .where(eq(venues.id, input.venueId))
  })

  // Report to Sentry only after the transaction commits, so a Sentry issue
  // always corresponds to a recorded alert rather than a rolled-back one. A
  // zero-event crawl *succeeds*, so nothing throws and no amount of Sentry
  // configuration could detect this on its own — the signal has to be handed
  // over explicitly. Email and the admin inbox both proved easy to miss.
  reportFailure({
    event: 'crawl.event_count_dropped',
    severity: severity === 'went_dark' ? 'error' : 'warn',
    venueId: input.venueId,
    venueName: input.venueName,
    crawlRunId: input.crawlRunId,
    dropSeverity: severity,
    guardsAteEverything,
    eventsFound: input.eventsFound,
    eventsUsable: input.eventsUsable,
    baselineCount,
    dropPercent,
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
      eventsUsable: input.eventsUsable,
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
