// Detects "the crawl is healthy and the events are real, but every 'Get
// tickets' button lands on the venue's homepage".
//
// The consumer CTA resolves ticketUrl ?? eventUrl ?? venue.websiteUrl. That
// last fallback is what makes this failure invisible: the button still renders,
// still looks right, and still goes somewhere plausible — it just drops the
// user on a generic event calendar instead of the show they tapped.
//
// Cervantes' Masterpiece Ballroom was the canary: 129 of 129 upcoming events
// carried neither URL for two days. Every existing guard read green, because
// all of them key off event *counts* and the counts were fine. The gap only
// closed because a human clicked a CTA and noticed where it landed.
//
// Deliberately measured against the venue's stored catalogue rather than this
// run's extracted rows. Two reasons:
//   - The sourceHash gate means an unchanged event isn't rewritten, so a row
//     that has been URL-less since long before this run never appears in the
//     current extraction — but its CTA is just as broken.
//   - Stored state is what consumers actually see. Alerting on it means the
//     alert clears when the user-visible symptom clears, not when extraction
//     happens to look right.
//
// Never fails the crawl: advisory detection layered on a run that completed.

import { and, eq, gte, isNull, lt, or, sql } from 'drizzle-orm'
import { db, events, notifications, venues } from '@concert-crawl/db'
import { upcomingEventConditions } from '@concert-crawl/db/upcoming-events'
import { reportFailure } from '@concert-crawl/logger'
import { evaluateCoverageCondition } from './triage-conditions.js'

// Thresholds and the ratio classifier live in triage-conditions.ts so the admin
// triage read path (#1215) and this write path can never drift. Kept as
// re-exports here for the existing import sites.
export {
  COVERAGE_MIN_CATALOGUE,
  COVERAGE_GAP_RATIO,
} from './triage-conditions.js'

// Mirrors ALERT_COOLDOWN_DAYS in event-count-alert.ts. Cleared on a healthy
// run so a venue that recovers and regresses alerts again rather than staying
// silenced for the rest of the window (the #1174 lesson).
export const COVERAGE_ALERT_COOLDOWN_DAYS = 7

export type CoverageSeverity = 'no_coverage' | 'partial_gap'

export interface UrlCoverageAlertInput {
  venueId: string
  venueName: string
  crawlRunId: string
  /**
   * Rows that survived the downstream guards on this run. Gates the check —
   * see runCheck for why a run that kept nothing is passed over.
   */
  eventsUsable: number
  /** venues.last_url_coverage_alert_at as of the start of this run. */
  lastUrlCoverageAlertAt: Date | null
  /** Override for tests; defaults to new Date(). */
  now?: Date
}

export type CoverageOutcome =
  | {
      fired: false
      reason:
        'not_healthy' | 'small_catalogue' | 'cooldown' | 'covered' | 'error'
    }
  | {
      fired: true
      severity: CoverageSeverity
      uncoveredCount: number
      upcomingCount: number
      uncoveredPercent: number
    }

/**
 * Check whether the venue's upcoming catalogue has lost its per-event ticket
 * links and, if so, insert an admin notification.
 *
 * Failures are swallowed for the same reason as checkEventCountDrop and
 * checkEventCeiling: the crawl already completed, and an advisory alert must
 * never turn a good run into a failed one.
 */
export async function checkUrlCoverage(
  input: UrlCoverageAlertInput,
): Promise<CoverageOutcome> {
  try {
    return await runCheck(input)
  } catch (err) {
    reportFailure({
      event: 'crawl.url_coverage_alert.error',
      severity: 'error',
      venueId: input.venueId,
      crawlRunId: input.crawlRunId,
      error: err instanceof Error ? err.message : String(err),
    })
    // Distinct from 'covered' so a swallowed failure can't masquerade as a
    // clean result — the integration tests assert 'covered' in two places, and
    // collapsing the error path into it would let a broken query pass them.
    return { fired: false, reason: 'error' }
  }
}

async function runCheck(
  input: UrlCoverageAlertInput,
): Promise<CoverageOutcome> {
  const now = input.now ?? new Date()

  // A run that kept nothing is a went-dark incident, and event-count-alert.ts
  // owns it. Classifying it here too would double-notify for one regression —
  // and worse, a dark venue's stale catalogue would read as a coverage gap for
  // as long as it stayed dark, burying the real cause.
  if (input.eventsUsable === 0) {
    return { fired: false, reason: 'not_healthy' }
  }

  // Consumer-visible upcoming catalogue only. The filters mirror the consumer
  // detail route's own visibility rules (apps/api/src/routes/events.ts): a
  // hidden, cancelled or already-missing event renders no live CTA for anyone,
  // so counting it here would let invisible rows trip an alert about a visible
  // symptom.
  //
  // The date bound is Denver's today, not the JS runtime's — Render runs UTC,
  // and for the ~7h each night where UTC is already tomorrow, a JS-derived
  // bound would drop the current evening's shows out of the denominator even
  // though their CTAs are still live. Matches DENVER_TODAY in crawl.ts.
  const [row] = await db
    .select({
      upcomingCount: sql<number>`count(*)::int`,
      uncoveredCount: sql<number>`count(*) filter (
        where ${events.ticketUrl} is null and ${events.eventUrl} is null
      )::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.venueId, input.venueId),
        ...upcomingEventConditions({
          from: sql`(NOW() AT TIME ZONE 'America/Denver')::date`,
        }),
      ),
    )

  const upcomingCount = row?.upcomingCount ?? 0
  const uncoveredCount = row?.uncoveredCount ?? 0

  // Stamp completeness ahead of the classifier's early returns. "Fully
  // covered" is a stricter fact than "no gap detected" — the classifier
  // tolerates a sub-threshold ratio, and a small catalogue never reaches it at
  // all — but the triage panel calls the date "last fully covered", so only a
  // genuine zero uncovered may set it (#1266). Deliberately not under the cooldown
  // compare-and-set below: a concurrent uncovered run can't make this reading
  // untrue, coverage was complete at this moment either way.
  //
  // The date must only ever move forward. Two covered runs can overlap — the
  // nightly cron and an admin-triggered crawl — and the one that finishes last
  // is not necessarily the one that read the catalogue last, so an
  // unconditional SET could regress "last fully covered" to the earlier
  // reading. The predicate makes the write monotonic in the database rather
  // than in the caller.
  if (upcomingCount > 0 && uncoveredCount === 0) {
    await db
      .update(venues)
      .set({ lastUrlCoverageOkAt: now, updatedAt: now })
      .where(
        and(
          eq(venues.id, input.venueId),
          or(
            isNull(venues.lastUrlCoverageOkAt),
            lt(venues.lastUrlCoverageOkAt, now),
          ),
        ),
      )
  }

  const condition = evaluateCoverageCondition({ upcomingCount, uncoveredCount })

  if (!condition.detected && condition.reason === 'small_catalogue') {
    return { fired: false, reason: 'small_catalogue' }
  }

  if (!condition.detected) {
    // A healthy run ends the incident, so drop the cooldown marker. Guarded by
    // a compare-and-set against the snapshot this run started with: the admin
    // trigger-crawl path can overlap the nightly cron for one venue, and an
    // unconditional clear would let this run wipe a marker a concurrent
    // uncovered run had just written, re-opening alerting for a venue whose
    // CTAs are still broken.
    if (input.lastUrlCoverageAlertAt) {
      await db
        .update(venues)
        .set({ lastUrlCoverageAlertAt: null, updatedAt: now })
        .where(
          and(
            eq(venues.id, input.venueId),
            eq(venues.lastUrlCoverageAlertAt, input.lastUrlCoverageAlertAt),
          ),
        )
    }
    return { fired: false, reason: 'covered' }
  }

  if (input.lastUrlCoverageAlertAt) {
    const cooldownMs = COVERAGE_ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    if (now.getTime() - input.lastUrlCoverageAlertAt.getTime() < cooldownMs) {
      return { fired: false, reason: 'cooldown' }
    }
  }

  // 'no_coverage' means not one upcoming event has a per-event link — the
  // Cervantes shape, and almost always an extraction regression rather than a
  // venue that genuinely stopped publishing links. 'partial_gap' is likelier to
  // be a subset of pages changing shape, so the two get different copy.
  const { condition: severity, uncoveredPercent } = condition

  // Notification insert + cooldown bump in one transaction, matching the two
  // sibling guards. Were these independent statements, a transient failure on
  // the bump would re-alert on the next crawl for the same incident.
  await db.transaction(async (tx) => {
    await tx.insert(notifications).values({
      type: 'admin_alert',
      category: 'crawl.url_coverage_gap',
      title:
        severity === 'no_coverage'
          ? `Ticket links missing: ${input.venueName}`
          : `Ticket links incomplete: ${input.venueName}`,
      body:
        severity === 'no_coverage'
          ? `All ${upcomingCount} upcoming events at ${input.venueName} have neither a ticket URL nor an event URL, so every "Get tickets" button falls back to the venue homepage.`
          : `${uncoveredCount} of ${upcomingCount} upcoming events at ${input.venueName} (${uncoveredPercent.toFixed(0)}%) have neither a ticket URL nor an event URL, so their "Get tickets" buttons fall back to the venue homepage.`,
      metadata: JSON.stringify({
        // Written as `coverage`, not `severity`: the admin crawl route parses
        // metadata with one shared Zod schema where `severity` is already the
        // went-dark / dropped-sharply enum. Reusing that key would make every
        // coverage row fail the enum and collapse to undefined, losing the
        // discriminator the badge needs. `kind` is spoken for by the ceiling
        // guard for the same reason.
        coverage: severity,
        venueId: input.venueId,
        crawlRunId: input.crawlRunId,
        uncoveredCount,
        upcomingCount,
        uncoveredPercent,
      }),
    })

    await tx
      .update(venues)
      .set({ lastUrlCoverageAlertAt: now, updatedAt: now })
      .where(eq(venues.id, input.venueId))
  })

  return {
    fired: true,
    severity,
    uncoveredCount,
    upcomingCount,
    uncoveredPercent,
  }
}
