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

// How many prior runs to read for both detections. Long enough that a single
// odd night can't trip either fingerprint, short enough to stay inside a
// venue's current programming rhythm.
export const CEILING_HISTORY_RUN_COUNT = 7

// Minimum prior readings before either detection will classify. Both need a
// sense of "normal" first, and migration 0061 deliberately leaves
// furthest_event_date NULL on historical rows, so the horizon check arms
// itself a few nightly crawls after deploy rather than firing on empty history.
export const CEILING_COLD_START_MIN_RUNS = 3

// How far the horizon must fall below its recent best to count. Generous on
// purpose: a single far-out show being cancelled or rescheduled moves the
// horizon legitimately, and that is a normal week at a venue. A truncation
// bites off months.
export const HORIZON_SHRINK_DAYS = 30

// Consecutive *successful* runs (this one included) that must report an
// identical eventsFound before it reads as pinned. See the header note on why
// failed and skipped runs are passed over rather than breaking the streak.
export const PINNED_RUN_COUNT = 5

// Below this count, an exactly-repeating number is unremarkable — a venue with
// four shows on calendar can genuinely report four for a week. The caps worth
// catching are large enough to look healthy, which is what made #1127 invisible.
export const PINNED_MIN_COUNT = 10

// Mirrors ALERT_COOLDOWN_DAYS in event-count-alert.ts. Cleared on a healthy
// run, so a venue that recovers and re-caps alerts again instead of staying
// silenced for the rest of the window (the #1174 lesson).
export const CEILING_ALERT_COOLDOWN_DAYS = 7

export type CeilingKind = 'horizon_shrank' | 'pinned_count'

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

  if (recent.length < CEILING_COLD_START_MIN_RUNS) {
    return { fired: false, reason: 'cold_start' }
  }

  const detected =
    detectHorizonShrink(input.furthestEventDate, recent) ??
    detectPinnedCount(input.eventsFound, recent)

  if (!detected) {
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
        kind: detected.kind,
        eventsFound: input.eventsFound,
        furthestEventDate: input.furthestEventDate,
      }),
    })

    await tx
      .update(venues)
      .set({ lastEventCeilingAlertAt: now, updatedAt: now })
      .where(eq(venues.id, input.venueId))
  })

  return { fired: true, kind: detected.kind, detail: detected.body }
}

interface Detection {
  kind: CeilingKind
  body: string
}

function detectHorizonShrink(
  furthestEventDate: string | null,
  recent: { furthestEventDate: string | null }[],
): Detection | null {
  if (!furthestEventDate) return null

  const readings = recent
    .map((row) => row.furthestEventDate)
    .filter((value): value is string => value !== null)

  if (readings.length < CEILING_COLD_START_MIN_RUNS) return null

  // Compare against the best recent reading rather than the previous run's, so
  // a cap that ratchets the horizon in over several nights still trips instead
  // of each night looking like a small acceptable step.
  const best = readings.reduce(
    (furthest, value) => (value > furthest ? value : furthest),
    readings[0]!,
  )
  const shrankDays = differenceInDays(best, furthestEventDate)
  if (shrankDays < HORIZON_SHRINK_DAYS) return null

  return {
    kind: 'horizon_shrank',
    body: `The furthest show announced by this venue moved ${shrankDays} days closer — now ${furthestEventDate}, against ${best} on a recent crawl. The crawl itself looks healthy, so check whether the venue's page has started truncating its calendar.`,
  }
}

function detectPinnedCount(
  eventsFound: number,
  recent: { eventsFound: number }[],
): Detection | null {
  if (eventsFound < PINNED_MIN_COUNT) return null

  const priorNeeded = PINNED_RUN_COUNT - 1
  if (recent.length < priorNeeded) return null

  const streak = recent.slice(0, priorNeeded)
  if (!streak.every((row) => row.eventsFound === eventsFound)) return null

  return {
    kind: 'pinned_count',
    body: `This venue has reported exactly ${eventsFound} events on its last ${PINNED_RUN_COUNT} successful crawls. An unchanged page is recorded as skipped, so an exactly repeating count on changed pages is the signature of a hard item cap rather than a stable calendar.`,
  }
}

// Both operands are 'YYYY-MM-DD' calendar dates from Postgres `date` columns,
// so parsing them as UTC midnight keeps the difference free of DST skew.
function differenceInDays(later: string, earlier: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(
    (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) /
      msPerDay,
  )
}
