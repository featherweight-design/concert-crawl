import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const inboxItemType = pgEnum('inbox_item_type', [
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure',
])

// Per-occurrence read marks. The key includes `source_created_at` (the same
// occurrence timestamp the GET row exposes) so an entity that re-enters the
// inbox — a re-blocked venue, a re-unverified event — is a NEW, unread
// occurrence rather than staying permanently read off a stale mark.
// onConflictDoNothing keeps the FIRST reader's row, so `readBy` records who
// first cleared THAT occurrence — later reads are captured only in audit_log,
// not here. Read-state itself is global (any admin's mark counts).
export const inboxReads = pgTable(
  'inbox_reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemType: inboxItemType('item_type').notNull(),
    itemId: text('item_id').notNull(),
    // The occurrence timestamp — must equal the row's sourceCreatedAt so the
    // GET join matches this mark to that occurrence and only that occurrence.
    sourceCreatedAt: timestamp('source_created_at', {
      withTimezone: true,
    }).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
    readBy: text('read_by').notNull(), // first reader only (see note above)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueItem: unique(
      'inbox_reads_item_type_item_id_source_created_at_unique',
    ).on(table.itemType, table.itemId, table.sourceCreatedAt),
  }),
)

// Per-category "read up to" watermark. mark-all-read upserts read_up_to = now()
// for a category (O(1)) instead of inserting one inbox_reads row per historical
// item. An item is read if it has an inbox_reads row OR its sourceCreatedAt is
// <= read_up_to for its type.
export const inboxReadWatermarks = pgTable('inbox_read_watermarks', {
  itemType: inboxItemType('item_type').primaryKey(),
  readUpTo: timestamp('read_up_to', { withTimezone: true }).notNull(),
  readBy: text('read_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
