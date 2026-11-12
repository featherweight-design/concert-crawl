import { and, eq, gte, sql } from 'drizzle-orm';
import { auditLog, db } from '@concert-crawl/db';
import type {
  NeedsYouCount,
  NeedsYouItem,
  NeedsYouKind,
} from '@concert-crawl/types';
import { MT_TIME_ZONE } from '../../../../lib/time.js';
import { rankNeedsYou } from './rank.js';
import { filterSnoozed, loadActiveSnoozes } from './snoozes.js';
import { loadNeedsYouItems } from './sources.js';

export const NEEDS_YOU_ANSWER_ACTION = 'needs_you.answer';

/** Visible items: sources, minus snoozes and Not useful, in queue order. */
export const listNeedsYou = async ({
  kind,
  now,
}: {
  kind?: NeedsYouKind;
  now: Date;
}): Promise<NeedsYouItem[]> => {
  const [items, snoozes] = await Promise.all([
    loadNeedsYouItems({ now }, kind),
    loadActiveSnoozes(now),
  ]);
  return rankNeedsYou(filterSnoozed(items, snoozes));
};

/** Answers recorded since midnight Mountain Time. */
const handledSince = async (now: Date): Promise<number> => {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, NEEDS_YOU_ANSWER_ACTION),
        gte(
          auditLog.createdAt,
          sql`(date_trunc('day', ${now.toISOString()}::timestamptz AT TIME ZONE ${MT_TIME_ZONE}) AT TIME ZONE ${MT_TIME_ZONE})`,
        ),
      ),
    );
  return row?.total ?? 0;
};

export const summarizeNeedsYou = async (
  items: NeedsYouItem[],
  now: Date,
): Promise<NeedsYouCount> => {
  const byKind: NeedsYouCount['byKind'] = {
    'show-dropped': 0,
    'show-moved': 0,
    'venue-failing': 0,
    'venue-blocked': 0,
    artist: 0,
    'event-low-confidence': 0,
    'price-check': 0,
    'price-batch': 0,
    bug: 0,
  };
  for (const item of items) byKind[item.kind] += 1;
  return {
    // A batch is one item, so the length is the number of decisions.
    decisions: items.length,
    byKind,
    handledToday: await handledSince(now),
  };
};

export const countNeedsYou = async (now: Date): Promise<NeedsYouCount> =>
  summarizeNeedsYou(await listNeedsYou({ now }), now);
