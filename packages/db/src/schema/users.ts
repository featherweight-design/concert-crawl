import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'sub_admin', 'user']);

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // Clerk user ID — source of truth is Clerk publicMetadata
  role: roleEnum('role').notNull(),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  priceCredScore: integer('price_cred_score').notNull().default(0),
  grantedBy: text('granted_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Per-user price-cred score. Keyed by Clerk user ID with a UNIQUE constraint so
// awards upsert (every fan gets a row on their first confirmed submission),
// unlike `user_roles.price_cred_score` which only existed for role-granted
// accounts — regular fans never got a row, so cred awards were silent no-ops and
// the profile always read 0. See issue #1012. `user_roles.price_cred_score` is
// retained (unused) for one release; its drop is a follow-up contract migration.
export const userCred = pgTable('user_cred', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  priceCredScore: integer('price_cred_score').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inviteCodes = pgTable(
  'invite_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    createdBy: text('created_by').notNull(),
    usedBy: text('used_by'),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: text('revoked_by'),
    /**
     * How many people this code admits (1 for a personal code, more for a
     * poster). `use_count` is claimed by a conditional UPDATE that only succeeds
     * below the cap, so two redeemers can never both take the last seat.
     * `used_by`/`used_at` still record the FIRST redemption, so every reader of
     * a single-use code keeps working; `invite_code_redemptions` records all.
     */
    maxUses: integer('max_uses').notNull().default(1),
    useCount: integer('use_count').notNull().default(0),
    /** Where a multi-use code was put, e.g. "Hi-Dive bathroom, Nov". */
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // The seat invariant, held by the database and not only by the claim.
    maxUsesCheck: check(
      'invite_codes_max_uses_check',
      sql`${table.maxUses} >= 1`,
    ),
    useCountCheck: check(
      'invite_codes_use_count_check',
      sql`${table.useCount} BETWEEN 0 AND ${table.maxUses}`,
    ),
  }),
);

/**
 * Every redemption of an invite code, one row per (code, person): the unique
 * pair is what stops one person spending two seats of a multi-use code.
 */
export const inviteCodeRedemptions = pgTable(
  'invite_code_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeId: uuid('code_id')
      .notNull()
      .references(() => inviteCodes.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('invite_code_redemptions_code_user_idx').on(
      table.codeId,
      table.userId,
    ),
  ],
);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(), // e.g. "venue.create", "user.role.grant"
  targetId: text('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const waitlistEntries = pgTable('waitlist_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type UserCred = typeof userCred.$inferSelect;
export type NewUserCred = typeof userCred.$inferInsert;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
