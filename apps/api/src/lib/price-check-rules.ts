// apps/api/src/lib/price-check-rules.ts
//
// The pure halves of the price-check rules (no DB access), so the price
// aggregation can use them without importing the DB client. The rules
// themselves are written up at the top of price-check.ts.

import type { PriceCheckFields } from '@concert-crawl/types';

/**
 * A live price outranks one under a check, so a checked price only leads a
 * slot that has no live price. Anywhere else it would sit beside the live
 * price as an alternate with no sign it's being checked. `slotOf` names the
 * slot: the tier on one event's page, event plus tier on a list surface.
 */
export function dropCheckedWhereLive<Row extends { contested: boolean }>(
  rows: readonly Row[],
  slotOf: (row: Row) => string,
): Row[] {
  const liveSlots = new Set(
    rows.filter((row) => !row.contested).map((row) => slotOf(row)),
  );
  return rows.filter((row) => !row.contested || !liveSlots.has(slotOf(row)));
}

export interface RankableCounter {
  id: string;
  corroborationCount: number;
  createdAt: Date;
}

/** Sort comparator: the leading counter first (rule 2 in price-check.ts). */
export function compareLeadingCounters(
  left: RankableCounter,
  right: RankableCounter,
): number {
  if (left.corroborationCount !== right.corroborationCount) {
    return right.corroborationCount - left.corroborationCount;
  }
  const timeDelta = left.createdAt.getTime() - right.createdAt.getTime();
  if (timeDelta !== 0) return timeDelta;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/**
 * The price-check fields a counter shape carries, from every pending update
 * on one price. The price's own submitter gets no action (an admin will
 * pick). Someone with a pending update on it can withdraw that update. Anyone
 * else can submit an update; a signed-out viewer gets that too, and the sheet
 * asks them to sign in.
 */
export function priceCheckFields(input: {
  viewerUserId: string | null;
  parentUserId: string | null;
  // Every pending counter against the one parent, the leading one included.
  counters: ReadonlyArray<{ id: string; userId: string | null }>;
}): PriceCheckFields {
  const { viewerUserId, parentUserId, counters } = input;
  const pendingCount = counters.length;
  if (viewerUserId !== null && parentUserId === viewerUserId) {
    return { pendingCount, viewerAction: 'none', viewerCounterId: null };
  }
  const own =
    viewerUserId === null
      ? undefined
      : counters.find((counter) => counter.userId === viewerUserId);
  if (own !== undefined) {
    return { pendingCount, viewerAction: 'withdraw', viewerCounterId: own.id };
  }
  return { pendingCount, viewerAction: 'submit_update', viewerCounterId: null };
}
