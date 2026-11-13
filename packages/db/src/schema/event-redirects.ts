import {
  date,
  index,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { events } from './events.js';

/**
 * Where a merged-away event went. Merging two listings of one night deletes the
 * loser row, so its id points here: `sourceId` is the deleted event (no foreign
 * key, the row is gone) and `targetId` the survivor. A merge repoints rows that
 * named the loser at the new survivor, so a chain is never longer than one hop.
 *
 * The `source*` key columns (admin 4a, migration 0115) record the deleted row's
 * crawl key: the crawl upsert's conflict key, `(venue_id, date,
 * canonical_artist, show_time)`. When the venue still lists the merged-away
 * show, the crawl finds it here and updates the target's crawl-owned fields
 * instead of inserting the duplicate again. NULL on redirects written before
 * 0115. `sourceVenueId` has no foreign key, like `sourceId`: it is a key, not
 * a reference.
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
    sourceVenueId: uuid('source_venue_id'),
    sourceDate: date('source_date'),
    sourceCanonicalArtist: text('source_canonical_artist'),
    sourceShowTime: time('source_show_time'),
  },
  (table) => [
    index('event_redirects_target_idx').on(table.targetId),
    index('event_redirects_source_key_idx').on(
      table.sourceVenueId,
      table.sourceDate,
    ),
  ],
);

export type EventRedirect = typeof eventRedirects.$inferSelect;
