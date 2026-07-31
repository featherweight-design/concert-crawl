// Detects "the crawl looks healthy, but the venue is only showing us the first
// N events" — the Fillmore gap from #1127, where two venues server-rendered
// exactly 36 events for months. Nothing alerted, because a hard cap returns a
// healthy, *stable* count: the went-dark check in event-count-alert.ts fires at
// zero usable events or below 30% of baseline, and a ceiling clears both.
//
// Two independent fingerprints, either of which raises one admin notification:
//
//   horizon_shrank — the furthest announced event date moved materially closer
//   than the venue's best recent reading. Venues announce forward, so this date
//   should climb or hold; a fall means far-out shows stopped reaching us.
//
//   pinned_count   — eventsFound is identical across several consecutive
//   *successful* runs. For a real venue whose page content changed (an
//   identical page is recorded 'skipped' by the page-hash dedup and never
//   reaches this check), an exactly repeating count is close to impossible and
//   is the signature of a cap.
//
//   Failed and skipped runs are passed over rather than treated as breaking the
//   streak: neither carries a count, so neither is evidence against a cap. A
//   venue that fails intermittently is still one we want this guard watching,
//   and a streak spanning a longer wall-clock window is stronger evidence, not
//   weaker — the longer the window, the less likely a real calendar holds at
//   exactly the same number.
//
// Never fails the crawl: this is advisory detection layered on a run that
// already completed.

import { and, desc, eq, ne } from 'drizzle-orm'
import { db, crawlRuns, notifications, venues } from '@concert-crawl/db'
import { reportFailure } from '@concert-crawl/logger'
import {
  CEILING_HISTORY_RUN_COUNT,
  evaluateCeilingCondition,
} from './triage-conditions.js'
import type { CeilingConditionKind as CeilingKind } from './triage-conditions.js'

// Thresholds and both detections live in triage-conditions.ts so the admin
// triage read path (#1215) and this write path can never drift. Kept as
// re-exports here for the existing import sites.
export {
  CEILING_HISTORY_RUN_COUNT,
  CEILING_COLD_START_MIN_RUNS,
  HORIZON_SHRINK_DAYS,
  PINNED_RUN_COUNT,
  PINNED_MIN_COUNT,
} from './triage-conditions.js'

// Mirrors ALERT_COOLDOWN_DAYS in event-count-alert.ts. Cleared on a healthy
// run, so a venue that recovers and re-caps alerts again instead of staying
// silenced for the rest of the window (the #1174 lesson).
export const CEILING_ALERT_COOLDOWN_DAYS = 7

export type { CeilingConditionKind as CeilingKind } from './triage-conditions.js'

export interface EventCeilingAlertInput {
  venueId: string
  venueName: string
  crawlRunId: string
  /** Raw extractor output for this run — what the pinned-count check compares. */
  eventsFound: number
  /** Rows that survived the downstream guards. Gates the check; see runCheck. */
  eventsUsable: number
  /** Latest date among this run's usable events, 'YYYY-MM-DD', or null. */
  furthestEventDate: string | null
  /** venues.last_event_ceiling_alert_at as of the start of this run. */
  lastEventCeilingAlertAt: Date | null
  /** Override for tests; defaults to new Date(). */
  now?: Date
}

export type CeilingOutcome =
  | {
      fired: false
      reason: 'not_healthy' | 'cold_start' | 'cooldown' | 'no_ceiling'
    }
  | {
      fired: true
      kind: CeilingKind
      detail: string
    }

/**
 * Check whether the just-completed crawl looks capped and, if so, insert an
 * admin notification.
 *
 * Failures are swallowed for the same reason as checkEventCountDrop: the crawl
 * itself already succeeded, and an advisory alert must never turn a good run
 * into a failed one.
 */
export async function checkEventCeiling(
  input: EventCeilingAlertInput,
): Promise<CeilingOutcome> {
  try {
    return await runCheck(input)
  } catch (err) {
    reportFailure({
      event: 'crawl.event_ceiling_alert.error',
      severity: 'error',
      venueId: input.venueId,
      crawlRunId: input.crawlRunId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { fired: false, reason: 'no_ceiling' }
  }
}

async function runCheck(
  input: EventCeilingAlertInput,
): Promise<CeilingOutcome> {
  const now = input.now ?? new Date()

  // A run that kept nothing is a went-dark incident, not a ceiling.
  // event-count-alert.ts owns that case; classifying it here too would
  // double-notify for one regression, and a zero-event run has no horizon
  // reading to compare anyway.
  if (input.eventsUsable === 0) {
    return { fired: false, reason: 'not_healthy' }
  }

  // Excluding 'skipped' matters for both detections: a page-hash dedup skip
  // writes eventsFound 0 by convention, which would break a genuine pinned
  // streak and drag the horizon comparison to null. Excluding the current run
  // matters because crawl.ts inserts its crawl_runs row before calling here.
  const recent = await db
    .select({
      eventsFound: crawlRuns.eventsFound,
      furthestEventDate: crawlRuns.furthestEventDate,
    })
    .from(crawlRuns)
    .where(
      and(
        eq(crawlRuns.venueId, input.venueId),
        eq(crawlRuns.status, 'success'),
        ne(crawlRuns.id, input.crawlRunId),
      ),
    )
    .orderBy(desc(crawlRuns.createdAt))
    .limit(CEILING_HISTORY_RUN_COUNT)

  const detected = evaluateCeilingCondition({
    eventsFound: input.eventsFound,
    furthestEventDate: input.furthestEventDate,
    recent,
  })

  if (!detected.detected && detected.reason === 'cold_start') {
    return { fired: false, reason: 'cold_start' }
  }

  if (!detected.detected) {
    // A healthy run ends the incident, so drop the cooldown marker. Guarded by
    // a compare-and-set against the snapshot this run started with: the admin
    // trigger-crawl path can overlap the nightly cron for one venue, and an
    // unconditional clear would let this run wipe a marker a concurrent capped
    // run had just written, re-opening alerting for a venue that is still
    // capped.
    if (input.lastEventCeilingAlertAt) {
      await db
        .update(venues)
        .set({ lastEventCeilingAlertAt: null, updatedAt: now })
        .where(
          and(
            eq(venues.id, input.venueId),
            eq(venues.lastEventCeilingAlertAt, input.lastEventCeilingAlertAt),
          ),
        )
    }
    return { fired: false, reason: 'no_ceiling' }
  }

  if (input.lastEventCeilingAlertAt) {
    const cooldownMs = CEILING_ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    if (now.getTime() - input.lastEventCeilingAlertAt.getTime() < cooldownMs) {
      return { fired: false, reason: 'cooldown' }
    }
  }

  // Notification insert + cooldown bump in one transaction. Were these two
  // independent statements, a transient failure on the bump would leave the
  // notification with no cooldown marker behind it, and the next nightly crawl
  // would notify again for the same regression.
  await db.transaction(async (tx) => {
    await tx.insert(notifications).values({
      type: 'admin_alert',
      category: 'crawl.event_ceiling_suspected',
      title: `Event catalogue may be capped: ${input.venueName}`,
      body: detected.body,
      metadata: JSON.stringify({
        venueId: input.venueId,
        crawlRunId: input.crawlRunId,
        kind: detected.condition,
        eventsFound: input.eventsFound,
        furthestEventDate: input.furthestEventDate,
      }),
    })

    await tx
      .update(venues)
      .set({ lastEventCeilingAlertAt: now, updatedAt: now })
      .where(eq(venues.id, input.venueId))
  })

  return { fired: true, kind: detected.condition, detail: detected.body }
}
