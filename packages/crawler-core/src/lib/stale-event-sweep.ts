import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { db, events, auditLog } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'

const logger = createLogger('stale-event-sweep')

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How long a row may sit unseen on the venue page before the sweep cancels it.
 * Two weeks is long enough to ride out a run of failed crawls and short enough
 * that the row clears before the venue rebooks the slot.
 */
export const STALE_EVENT_CANCEL_DAYS = 14

/**
 * `audit_log.actor_id` is a plain text column with no FK to Clerk, so a
 * background job can own its entries directly. The `system:` prefix is what
 * tells the admin Missing tab this was an automatic cancellation rather than a
 * human one.
 */
export const STALE_SWEEP_ACTOR_ID = 'system:stale-event-sweep'

export const STALE_SWEEP_AUDIT_ACTION = 'event.auto_cancel.stale'

interface SweepResult {
  cancelled: number
}

/**
 * #675 — cancel events the crawler stopped seeing more than
 * `STALE_EVENT_CANCEL_DAYS` ago.
 *
 * Only `upcoming` rows are touched. `cancelled` and `postponed` both mean a
 * decision has already been made about the row, and re-deciding it would
 * overwrite a human's triage. Because the update narrows on `status` and clears
 * it in the same statement, a second run finds nothing — the sweep is
 * idempotent without needing its own bookkeeping column.
 */
export async function sweepStaleEvents(
  now: Date = new Date(),
): Promise<SweepResult> {
  const cutoff = new Date(now.getTime() - STALE_EVENT_CANCEL_DAYS * DAY_MS)

  // One transaction so a cancellation can never commit without the audit row
  // that explains it — an unexplained `cancelled` row is indistinguishable from
  // a human's triage decision.
  const cancelled = await db.transaction(async (tx) => {
    const rows = await tx
      .update(events)
      .set({ status: 'cancelled', updatedAt: now })
      .where(
        and(
          eq(events.status, 'upcoming'),
          isNotNull(events.firstMissingAt),
          lt(events.firstMissingAt, cutoff),
        ),
      )
      .returning({ id: events.id, firstMissingAt: events.firstMissingAt })

    if (rows.length > 0) {
      await tx.insert(auditLog).values(
        rows.map((row) => ({
          actorId: STALE_SWEEP_ACTOR_ID,
          action: STALE_SWEEP_AUDIT_ACTION,
          targetId: row.id,
          metadata: {
            firstMissingAt: row.firstMissingAt?.toISOString() ?? null,
            thresholdDays: STALE_EVENT_CANCEL_DAYS,
          },
        })),
      )
    }

    return rows
  })

  // Logged even at zero so the nightly run leaves proof it happened.
  logger.info(
    { cancelled: cancelled.length, cutoff: cutoff.toISOString() },
    'Stale event sweep complete',
  )

  return { cancelled: cancelled.length }
}
