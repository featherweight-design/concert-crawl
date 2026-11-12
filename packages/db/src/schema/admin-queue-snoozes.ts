import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { venues } from './venues.js';

// What the admin Needs you queue is told to leave alone. Two shapes share the
// table:
//   - a snooze: `item_key` set, hidden until `until` passes;
//   - "Not useful": `not_useful` true with a `kind` and `venue_id`, which hides
//     that kind of item for that venue until it is cleared.
export const adminQueueSnoozes = pgTable(
  'admin_queue_snoozes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // `<kind>:<id>[:<evidenceKey>]`. Null on a "Not useful" row.
    itemKey: text('item_key'),
    kind: text('kind').notNull(),
    venueId: uuid('venue_id').references(() => venues.id, {
      onDelete: 'cascade',
    }),
    until: timestamp('until', { withTimezone: true }),
    notUseful: boolean('not_useful').notNull().default(false),
    reason: text('reason'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('admin_queue_snoozes_item_key_idx')
      .on(table.itemKey)
      .where(sql`${table.itemKey} is not null`),
    uniqueIndex('admin_queue_snoozes_not_useful_idx')
      .on(table.kind, table.venueId)
      .where(sql`${table.notUseful}`),
  ],
);

export type AdminQueueSnooze = typeof adminQueueSnoozes.$inferSelect;
