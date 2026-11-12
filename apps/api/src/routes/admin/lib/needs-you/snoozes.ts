import { and, eq, gt, isNotNull, or } from 'drizzle-orm';
import { adminQueueSnoozes, db } from '@concert-crawl/db';
import type { NeedsYouItem } from '@concert-crawl/types';

export interface ActiveSnoozes {
  /** Item keys snoozed past `now`. */
  keys: ReadonlySet<string>;
  /** `<kind>:<venueId>` pairs an admin marked Not useful. */
  notUseful: ReadonlySet<string>;
}

export const notUsefulKey = (kind: string, venueId: string): string =>
  `${kind}:${venueId}`;

export const loadActiveSnoozes = async (now: Date): Promise<ActiveSnoozes> => {
  const rows = await db
    .select({
      itemKey: adminQueueSnoozes.itemKey,
      kind: adminQueueSnoozes.kind,
      venueId: adminQueueSnoozes.venueId,
      notUseful: adminQueueSnoozes.notUseful,
    })
    .from(adminQueueSnoozes)
    .where(
      or(
        eq(adminQueueSnoozes.notUseful, true),
        and(
          isNotNull(adminQueueSnoozes.itemKey),
          gt(adminQueueSnoozes.until, now),
        ),
      ),
    );

  const keys = new Set<string>();
  const notUseful = new Set<string>();
  for (const row of rows) {
    if (row.notUseful) {
      if (row.venueId !== null)
        notUseful.add(notUsefulKey(row.kind, row.venueId));
    } else if (row.itemKey !== null) {
      keys.add(row.itemKey);
    }
  }
  return { keys, notUseful };
};

export const isHidden = (item: NeedsYouItem, snoozes: ActiveSnoozes): boolean =>
  snoozes.keys.has(item.key) ||
  (item.venueId !== null &&
    snoozes.notUseful.has(notUsefulKey(item.kind, item.venueId)));

export const filterSnoozed = (
  items: NeedsYouItem[],
  snoozes: ActiveSnoozes,
): NeedsYouItem[] => items.filter((item) => !isHidden(item, snoozes));
