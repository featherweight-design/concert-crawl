import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { events } from './events.js';

/**
 * A person hiding a "No longer listed" show from their own lists. The show stays
 * delisted for everyone; this only stops it appearing again for them. Undo is
 * deleting the row. One row per (person, show). Cascades with the event; a
 * person's rows are deleted with their account (the user-data registry).
 */
export const userEventDismissals = pgTable(
  'user_event_dismissals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('user_event_dismissals_user_event_idx').on(
      table.userId,
      table.eventId,
    ),
  ],
);

export type UserEventDismissal = typeof userEventDismissals.$inferSelect;
