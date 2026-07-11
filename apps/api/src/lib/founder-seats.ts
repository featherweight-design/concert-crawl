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
): Promise<SeatRestoreOutcome> => {
  // Idempotency: at most one restore per claiming subscription.
  const [existingRestore] = await db
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
  const restored = await db
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
    // Nothing incremented — the window is already at seatsTotal, which means
    // seat accounting drifted somewhere. Loud log, no event write (nothing
    // was restored).
    apiLogger.error(
      { subscriptionId: input.subscriptionId, reason: input.reason },
      'founder-seats: restore skipped — seats_remaining already at seats_total',
    )
    return 'seats_already_full'
  }

  await db.insert(subscriptionEvents).values({
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
