import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// "Not for us" on the Add a venue Start list (admin redesign decision A7,
// migration 0132). Fans suggest venues as free text in `feedback`, so a
// dismissal is keyed by the venue name, normalized by the API: lower case,
// letters and digits only. At most one active row per key; Undo sets
// `cleared_at`, and a later dismissal inserts a new row.
export const venueSuggestionDismissals = pgTable(
  'venue_suggestion_dismissals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nameKey: text('name_key').notNull(),
    // The name as the admin saw it, so Undo and the audit row read naturally.
    displayName: text('display_name').notNull(),
    dismissedBy: text('dismissed_by').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    clearedAt: timestamp('cleared_at', { withTimezone: true }),
    clearedBy: text('cleared_by'),
  },
  (table) => [
    uniqueIndex('venue_suggestion_dismissals_active_idx')
      .on(table.nameKey)
      .where(sql`${table.clearedAt} IS NULL`),
  ],
);

export type VenueSuggestionDismissal =
  typeof venueSuggestionDismissals.$inferSelect;
