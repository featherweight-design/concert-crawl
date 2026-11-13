import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { events } from './events.js';

/**
 * Where a merged-away event went. Merging two listings of one night deletes the
 * loser row, so its id points here: `sourceId` is the deleted event (no foreign
 * key, the row is gone) and `targetId` the survivor. A merge repoints rows that
 * named the loser at the new survivor, so a chain is never longer than one hop.
 */
export const eventRedirects = pgTable(
  'event_redirects',
  {
    sourceId: uuid('source_id').primaryKey(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('event_redirects_target_idx').on(table.targetId)],
);

export type EventRedirect = typeof eventRedirects.$inferSelect;
