import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Concert Crews (#1226). Four tables and nothing else: crew shows are derived
// at read time by joining crew_members against the shipped
// user_events.attending_at, so there is deliberately no crew_shows table (D1).
// A denormalized copy would need invalidating on every attendance toggle,
// every join, and every leave, for a query that is capped at 12 members.

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // Clerk user id of the current keeper. Moves on handoff, so this is
  // deliberately NOT named createdBy — who created the crew is not a fact the
  // product uses. Only this user may rename, reroll, remove members, or delete.
  keeperId: text('keeper_id').notNull(),
  // Seed input for the patch alongside crews.id. Written ONLY by an explicit,
  // confirmed "New patch" action. Never by rename, never by membership change.
  patchSalt: integer('patch_salt').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// memberCount is NOT stored. It is count(*) over crew_members, read under the
// row lock that enforces the 12-member cap (D4). A denormalized counter is a
// second source of truth for a number that is never larger than 12.
export const crewMembers = pgTable(
  'crew_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    crewId: uuid('crew_id')
      .notNull()
      .references(() => crews.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    crewUserUniqueIdx: uniqueIndex('crew_members_crew_user_idx').on(
      table.crewId,
      table.userId,
    ),
    // Drives "my crews" on every page load.
    userIdx: index('crew_members_user_idx').on(table.userId),
  }),
)

export const crewInvites = pgTable(
  'crew_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    crewId: uuid('crew_id')
      .notNull()
      .references(() => crews.id, { onDelete: 'cascade' }),
    // Plaintext by necessity — see D3. 72 bits, base64url. The invite sheet
    // re-displays the live link to any member at any time, and a hash is
    // one-way. The token IS the capability: it must never reach a log line, a
    // Sentry breadcrumb, or an error body. Log the resolved crewId instead.
    token: text('token').notNull().unique(),
    // Immutable here, unlike crews.keeperId — an invite is attributed to
    // whoever minted it even after the keeper changes. Nullable only so the
    // inviter can delete their account: USER_DATA_REGISTRY anonymizes this row
    // rather than dropping it, since revoking the invite would break a live
    // link the crew is still using. Null means "the inviter has left", never
    // "unattributed at creation".
    createdBy: text('created_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: text('revoked_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Many rows per crew is normal — expired and revoked invites are retained.
  // "At most one live link" is enforced in the API (PR-3) under the same
  // SELECT ... FOR UPDATE lock on the crews row that the join path takes, not
  // by a partial unique index: liveness is now() against expires_at, which no
  // index predicate can express.
  (table) => ({
    crewIdx: index('crew_invites_crew_idx').on(table.crewId),
  }),
)

// Presence of a row IS the muted state — unmuting deletes it. No boolean
// column, which would invite the tri-state (null / true / false) a nullable
// boolean always drags in.
export const crewMutes = pgTable(
  'crew_mutes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    crewId: uuid('crew_id')
      .notNull()
      .references(() => crews.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    mutedAt: timestamp('muted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    crewUserUniqueIdx: uniqueIndex('crew_mutes_crew_user_idx').on(
      table.crewId,
      table.userId,
    ),
  }),
)

export type CrewRow = typeof crews.$inferSelect
export type NewCrewRow = typeof crews.$inferInsert
export type CrewMemberRow = typeof crewMembers.$inferSelect
export type NewCrewMemberRow = typeof crewMembers.$inferInsert
export type CrewInviteRow = typeof crewInvites.$inferSelect
export type NewCrewInviteRow = typeof crewInvites.$inferInsert
export type CrewMuteRow = typeof crewMutes.$inferSelect
export type NewCrewMuteRow = typeof crewMutes.$inferInsert
