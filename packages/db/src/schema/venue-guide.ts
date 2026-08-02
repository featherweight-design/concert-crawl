import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { venues } from './venues.js'

// #764 first-timer guide chips. One row per AUTHORED or PLACEHOLDER chip —
// the design's third state, `blank`, is the absence of a row and is made
// unrepresentable by venue_guide_chips_state_check (migration 0068).
//
// chipType is text rather than a pgEnum for the same reason venues.platform
// is (see venues.ts): #997 expands the chip pool and must not need an
// ALTER TYPE. Values are validated against GUIDE_CHIP_ORDER by Zod at the
// API boundary.
export const venueGuideChips = pgTable(
  'venue_guide_chips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    chipType: text('chip_type').notNull(),
    body: text('body').notNull(),
    isPlaceholder: boolean('is_placeholder').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    venueTypeIdx: uniqueIndex('venue_guide_chips_venue_type_idx').on(
      table.venueId,
      table.chipType,
    ),
  }),
)

export type VenueGuideChipRow = typeof venueGuideChips.$inferSelect
export type NewVenueGuideChipRow = typeof venueGuideChips.$inferInsert
