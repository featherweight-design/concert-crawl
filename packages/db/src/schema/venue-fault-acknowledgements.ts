import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { venues } from './venues.js'

// An operator's judgement that a triage fault is expected and unfixable — the
// permanent Live Nation list cap on Summit, a seasonal venue whose calendar
// genuinely ends in November.
//
// This is not a dismissal. `evidence_value` records the figure the operator was
// looking at when they acknowledged, so the fault returns the moment that figure
// moves. Suppressing the row outright would hide the one change worth seeing.
export const venueFaultAcknowledgements = pgTable(
  'venue_fault_acknowledgements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    condition: text('condition').notNull(),
    // Ceiling's 'pinned_count' / 'horizon_shrank'; null for conditions that have
    // only one evidence shape.
    evidenceKind: text('evidence_kind'),
    // Nullable because a blocked venue that never returned an HTTP status has no
    // figure to acknowledge. A sentinel string was rejected: every candidate
    // collides with a value some condition can legitimately produce.
    evidenceValue: text('evidence_value'),
    reason: text('reason').notNull(),
    acknowledgedBy: text('acknowledged_by').notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueVenueCondition: unique(
      'venue_fault_acknowledgements_venue_condition_uniq',
    ).on(table.venueId, table.condition),
  }),
)

export type VenueFaultAcknowledgement =
  typeof venueFaultAcknowledgements.$inferSelect
export type NewVenueFaultAcknowledgement =
  typeof venueFaultAcknowledgements.$inferInsert
