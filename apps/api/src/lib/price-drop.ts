// #1107: shared helpers for the three writers that can lower an event's
// headline price (admin corroboration, community confirm promotion, and
// price-check resolution). Each writer reads the event's PRE-update
// ticketPriceMin under FOR UPDATE inside its transaction, decides with
// `detectPriceDrop`, and calls `fanoutPriceDrop` only AFTER the commit.

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
