import { and, eq, gte, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
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
export const NEEDS_YOU_UNDO_ACTION = 'needs_you.undo';

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

/**
 * Answers recorded since midnight Mountain Time, net of undos: an answer that
 * has an undo row no longer counts as handled.
 */
const handledSince = async (now: Date): Promise<number> => {
  const undone = alias(auditLog, 'undone');
  const dayStart = sql`(date_trunc('day', ${now.toISOString()}::timestamptz AT TIME ZONE ${MT_TIME_ZONE}) AT TIME ZONE ${MT_TIME_ZONE})`;
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, NEEDS_YOU_ANSWER_ACTION),
        notExists(
          db
            .select({ one: sql`1` })
            .from(undone)
            .where(
              and(
                eq(undone.action, NEEDS_YOU_UNDO_ACTION),
                // An undo follows its answer, so today's answers are only
                // ever undone today: bounding it keeps the scan to one day.
                gte(undone.createdAt, dayStart),
                sql`${undone.metadata}->>'answerAuditId' = ${auditLog.id}::text`,
              ),
            ),
        ),
        gte(auditLog.createdAt, dayStart),
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
