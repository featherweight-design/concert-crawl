import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * The ladder (admin redesign Phase 5c): Off, Me, Beta, Everyone. `me` is the
 * admin who set the stage (`stageOwnerUserId`); `beta` is the beta cohort plus
 * the named people; `everyone` is every signed-in user.
 */
export const flagStageEnum = pgEnum('flag_stage', [
  'off',
  'me',
  'beta',
  'everyone',
]);

export const flagHistoryKindEnum = pgEnum('flag_history_kind', [
  'stage_set',
  'verified',
  'unverified',
  'person_added',
  'person_removed',
]);

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  // `enabled`, the old boolean, is nullable and unread since 0125 and is left
  // out of the schema so no code can touch it again; 0126 drops the column.
  stage: flagStageEnum('stage').notNull().default('off'),
  /** Who "Me" is, read only while `stage` is `me`. */
  stageOwnerUserId: text('stage_owner_user_id'),
  /** Set by hand on staging admin; production locks a flag until it is set there. */
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by'),
  verifiedNote: text('verified_note'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text('updated_by').notNull(),
});

/** The named people on a flag (they see it at Beta and above of their own). */
export const featureFlagUsers = pgTable(
  'feature_flag_users',
  {
    flagKey: text('flag_key')
      .notNull()
      .references(() => featureFlags.key, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    addedBy: text('added_by').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.flagKey, table.userId] }),
  }),
);

/**
 * Every change to a flag. Starts with one synthetic "stage set from enabled"
 * row per flag. `checks` holds the Mark-verified checks as booleans.
 */
export const featureFlagHistory = pgTable(
  'feature_flag_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flagKey: text('flag_key')
      .notNull()
      .references(() => featureFlags.key, { onDelete: 'cascade' }),
    kind: flagHistoryKindEnum('kind').notNull(),
    fromStage: flagStageEnum('from_stage'),
    toStage: flagStageEnum('to_stage'),
    subjectUserId: text('subject_user_id'),
    actorUserId: text('actor_user_id').notNull(),
    note: text('note'),
    checks: jsonb('checks').$type<Record<string, boolean>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    flagCreatedIdx: index('feature_flag_history_flag_key_created_at_idx').on(
      table.flagKey,
      table.createdAt.desc(),
    ),
  }),
);

export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert;
export type FeatureFlagUserRow = typeof featureFlagUsers.$inferSelect;
export type FeatureFlagHistoryRow = typeof featureFlagHistory.$inferSelect;
