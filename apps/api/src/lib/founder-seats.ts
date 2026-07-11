// apps/api/src/lib/founder-seats.ts
//
// Shared founder seat restoration (eng infra spec Part 2 §3.2).
//
// Fires on exactly three paths, each keyed to the claiming subscription:
//   1. POST /v1/billing/checkout-abandon (user dismissed the surface)
//   2. customer.subscription.updated → status incomplete_expired
//   3. customer.subscription.deleted where the subscription never paid
//
// Idempotent per claim: a founder_seat_restored event carrying this
// subscriptionId means the seat was already given back — a seat is restored
// at most once per claim. A paid-then-cancelled Founder never restores
// (seats are lifetime claims, not concurrent-subscriber counts) — callers
// enforce that gate; this helper only guards double-restoration.

import { and, eq, lt, sql } from 'drizzle-orm'
import { db, founderWindow, subscriptionEvents } from '@concert-crawl/db'
import type { DbExecutor } from './db-executor.js'
import { apiLogger } from './logger.js'

export type SeatRestoreReason =
  'checkout_abandoned' | 'incomplete_expired' | 'never_paid_deleted'

export type SeatRestoreOutcome =
  'restored' | 'already_restored' | 'seats_already_full'

export interface SeatRestoreInput {
  userId: string
  /** The Stripe subscription whose claim is being released. */
  subscriptionId: string
  /** Seat number from the subscription's founderSeatNumber metadata. */
  seatNumber: number | null
  reason: SeatRestoreReason
  /** Correlating webhook event, when webhook-originated. */
  stripeEventId?: string | null
}

export const restoreFounderSeat = async (
  input: SeatRestoreInput,
  dbClient: DbExecutor = db,
): Promise<SeatRestoreOutcome> =>
  // A transaction with a FOR UPDATE lock on the singleton window row
  // serializes concurrent restores for the same claim (an abandon call can
  // race the incomplete_expired/deleted webhooks) — without it, the
  // idempotency pre-check below is check-then-act racy and two callers
  // could both increment. When dbClient is already a transaction (webhook
  // paths) this nests as a savepoint and the lock holds to outer commit.
  dbClient.transaction(async (tx) => {
    await tx
      .select({ id: founderWindow.id })
      .from(founderWindow)
      .where(eq(founderWindow.id, 1))
      .for('update')

    // Idempotency: at most one restore per claiming subscription.
    const [existingRestore] = await tx
      .select({ id: subscriptionEvents.id })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.type, 'founder_seat_restored'),
          sql`${subscriptionEvents.metadata}->>'subscriptionId' = ${input.subscriptionId}`,
        ),
      )
      .limit(1)
    if (existingRestore) {
      apiLogger.info(
        { subscriptionId: input.subscriptionId, reason: input.reason },
        'founder-seats: seat already restored for this claim — skipping',
      )
      return 'already_restored'
    }

    // Guarded increment — seats never exceed seatsTotal.
    const restored = await tx
      .update(founderWindow)
      .set({ seatsRemaining: sql`${founderWindow.seatsRemaining} + 1` })
      .where(
        and(
          eq(founderWindow.id, 1),
          lt(founderWindow.seatsRemaining, founderWindow.seatsTotal),
        ),
      )
      .returning({ seatsRemaining: founderWindow.seatsRemaining })
    if (restored.length === 0) {
      // Nothing incremented — the window is already at seatsTotal, which
      // means seat accounting drifted somewhere. Loud log, no event write
      // (nothing was restored).
      apiLogger.error(
        { subscriptionId: input.subscriptionId, reason: input.reason },
        'founder-seats: restore skipped — seats_remaining already at seats_total',
      )
      return 'seats_already_full'
    }

    await tx.insert(subscriptionEvents).values({
      userId: input.userId,
      type: 'founder_seat_restored',
      stripeEventId: input.stripeEventId ?? null,
      metadata: {
        subscriptionId: input.subscriptionId,
        seatNumber: input.seatNumber,
        reason: input.reason,
      },
    })
    apiLogger.info(
      {
        subscriptionId: input.subscriptionId,
        seatNumber: input.seatNumber,
        reason: input.reason,
      },
      'founder-seats: seat restored',
    )
    return 'restored'
  })

/**
 * True when the subscription never produced a paid invoice — no
 * subscription_created audit event carries its ID. Gates seat restoration:
 * paid-then-cancelled Founders keep their lifetime claim (§3.2).
 */
export const subscriptionNeverPaid = async (
  subscriptionId: string,
  dbClient: DbExecutor = db,
): Promise<boolean> => {
  const [paidEvent] = await dbClient
    .select({ id: subscriptionEvents.id })
    .from(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.type, 'subscription_created'),
        sql`${subscriptionEvents.metadata}->>'subscriptionId' = ${subscriptionId}`,
      ),
    )
    .limit(1)
  return paidEvent === undefined
}

/**
 * Parses the founderSeatNumber stamped into Stripe subscription metadata at
 * claim time (spec §3.1). Null when the subscription is not a founder claim.
 */
export const parseFounderSeatNumber = (
  metadata: Record<string, string> | null | undefined,
): number | null => {
  const raw = metadata?.['founderSeatNumber']
  if (raw === undefined) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? null : parsed
}
