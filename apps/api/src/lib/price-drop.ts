// #1107: shared helpers for the three writers that can lower an event's
// headline price (admin corroboration, community confirm promotion, and
// price-check resolution). Each writer reads the event's PRE-update
// ticketPriceMin under FOR UPDATE inside its transaction, decides with
// `detectPriceDrop`, and calls `fanoutPriceDrop` only AFTER the commit.
//
// LOCK ORDER. Every price writer takes its row locks in one global order, or
// two overlapping writers can each hold what the other wants and Postgres
// aborts one as a deadlock:
//   1. price_submissions rows (FOR UPDATE reads, status updates, and the
//      box-office corroborated unique-index entry those updates claim)
//   2. user_cred (awardPriceCred's upsert)
//   3. events (FOR NO KEY UPDATE pre-read, then the price update)
// FOR NO KEY UPDATE rather than FOR UPDATE on events: it still serializes
// price writers but does not block the KEY SHARE lock a concurrent
// foreign-key check (e.g. a dispute inserting a counter) takes on the event.
// Writers: admin/prices.ts (1, 2, 3), price-submission-confirms.ts (1, 3; no
// cred award), admin/contests.ts resolve challenger_wins (1, 2, 3) and
// parent_wins (1 only, no event lock).

import {
  db,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db'
import { fanoutWatchNotification } from '@concert-crawl/push'

export interface PriceDrop {
  eventId: string
  oldPriceMin: string
  newPriceMin: string
}

// Compare two numeric-string prices (from Drizzle's `numeric(10,2)` columns,
// which come back as string) for a strict drop. When either side isn't
// parseable as a number, returns false — a "drop" claim we can't verify is
// better skipped than false-positived into a bogus notification.
export const isStrictlyLowerNumeric = (
  candidate: string,
  baseline: string,
): boolean => {
  const candidateNum = Number.parseFloat(candidate)
  const baselineNum = Number.parseFloat(baseline)
  if (Number.isNaN(candidateNum) || Number.isNaN(baselineNum)) return false
  return candidateNum < baselineNum
}

// Real price-drop = strictly lower minimum. Equal prices are a corroboration
// (same number, different source) and shouldn't fire a notification. Higher
// prices are not a drop, and neither is a first price on an event that had
// none.
export const detectPriceDrop = (
  eventId: string,
  oldPriceMin: string | null | undefined,
  newPriceMin: string,
): PriceDrop | undefined => {
  if (oldPriceMin == null) return undefined
  if (!isStrictlyLowerNumeric(newPriceMin, oldPriceMin)) return undefined
  return { eventId, oldPriceMin, newPriceMin }
}

// Fan out watch.pricedrop to status='watching' users. Call AFTER the price
// write commits. Best-effort: fanoutWatchNotification never throws, and the
// price update is the primary state change, so a fan-out failure can't (and
// shouldn't) roll it back or fail the request.
export const fanoutPriceDrop = async (drop: PriceDrop): Promise<void> => {
  await fanoutWatchNotification(
    { db, notifications, userEvents, events, venues },
    {
      eventId: drop.eventId,
      category: 'watch.pricedrop',
      pricedrop: {
        newPriceMin: drop.newPriceMin,
        oldPriceMin: drop.oldPriceMin,
      },
    },
  )
}
