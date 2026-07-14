/**
 * Concert Crawl — delete all fixture-user-owned rows from staging.
 *
 * Called at the start of every `pnpm db:seed:staging:synthetic` run so that
 * generators (Tasks 3–5) can insert fresh rows without hitting duplicate-key
 * conflicts. This implements the "delete and regenerate" idempotency model.
 *
 * Delete order respects FK constraints — children before parents:
 *   submissionConfirms → priceSubmissions → feedback → userEvents
 *     → notifications → userProfiles
 *
 * Notifications: the `userId` column is nullable to accommodate real
 * admin-broadcast rows (system-generated, no owner). This cleanup uses
 * `inArray(notifications.userId, fixtureUserIds)`, which is safe because SQL
 * evaluates `NULL IN (...)` as NULL (not TRUE) — real broadcast rows are
 * never matched and never deleted. The synthetic seeder therefore MUST
 * attribute every notification (including admin_alert rows) to a fixture
 * user; see `generators/notifications.ts` for the enforcement point. A
 * `userId: null` synthetic row would leak across re-runs and violate the
 * seeder's delete-and-regenerate idempotency contract.
 *
 * The `fixtureUserIds` value is injected via deps rather than imported directly
 * so callers (and tests) can pass a narrowed subset of users.
 */

import { inArray, or } from 'drizzle-orm'
import {
  feedback,
  notifications,
  priceSubmissions,
  submissionConfirms,
  userEvents,
  userProfiles,
} from '../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from './sync-venues.js'

export async function cleanupFixtures(deps: {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
}): Promise<{ deleted: Record<string, number> }> {
  const { staging, fixtureUserIds } = deps

  // Empty fixture set → nothing to delete. Drizzle's inArray([]) emits
  // `IN ()`, which is invalid Postgres SQL (some drivers substitute
  // `IN (NULL)` or fail outright); returning zeros up front avoids the
  // driver-dependent behavior and matches the "safe for narrowed subsets"
  // contract other seed-staging helpers rely on.
  if (fixtureUserIds.length === 0) {
    return {
      deleted: {
        submissionConfirms: 0,
        priceSubmissions: 0,
        feedback: 0,
        userEvents: 0,
        notifications: 0,
        userProfiles: 0,
      },
    }
  }

  // 1. submissionConfirms — child of priceSubmissions.
  // Delete confirms that EITHER a fixture user submitted OR that belong to
  // a fixture-user-owned submission. The second clause is what makes the
  // reported count accurate: `submission_confirms.submission_id ->
  // price_submissions.id` has `onDelete: 'cascade'`, so step 2 would
  // silently drop confirms attached to fixture submissions even if the
  // confirmer wasn't a fixture user, and step 1's userId-only filter
  // would undercount them. Combining both filters here makes the
  // "fixture-owned" scope explicit and the count truthful.
  //
  // Note: fetching fixture submission IDs via a subselect keeps this a
  // single statement even if Drizzle doesn't produce a subquery — the
  // separate SELECT is a clarity-vs-round-trip trade the plan prefers.
  const fixtureSubmissionRows = await staging
    .select({ id: priceSubmissions.id })
    .from(priceSubmissions)
    .where(inArray(priceSubmissions.userId, [...fixtureUserIds]))
  const fixtureSubmissionIds = fixtureSubmissionRows.map((row) => row.id)

  const confirmsWhere =
    fixtureSubmissionIds.length > 0
      ? or(
          inArray(submissionConfirms.userId, [...fixtureUserIds]),
          inArray(submissionConfirms.submissionId, fixtureSubmissionIds),
        )
      : inArray(submissionConfirms.userId, [...fixtureUserIds])
  const deletedSubmissionConfirms = await staging
    .delete(submissionConfirms)
    .where(confirmsWhere)
    .returning({ id: submissionConfirms.id })

  // 2. priceSubmissions — child of events; parent of submissionConfirms.
  // Any orphaned confirms would cascade-drop here, but step 1 already
  // handled them, so this delete acts only on the parent rows.
  const deletedPriceSubmissions = await staging
    .delete(priceSubmissions)
    .where(inArray(priceSubmissions.userId, [...fixtureUserIds]))
    .returning({ id: priceSubmissions.id })

  // 3. feedback — no downstream FK children
  const deletedFeedback = await staging
    .delete(feedback)
    .where(inArray(feedback.userId, [...fixtureUserIds]))
    .returning({ id: feedback.id })

  // 4. userEvents — no downstream FK children
  const deletedUserEvents = await staging
    .delete(userEvents)
    .where(inArray(userEvents.userId, [...fixtureUserIds]))
    .returning({ id: userEvents.id })

  // 5. notifications — nullable userId; NULL IN (...) evaluates to NULL so
  //    admin-broadcast rows are never matched.
  const deletedNotifications = await staging
    .delete(notifications)
    .where(inArray(notifications.userId, [...fixtureUserIds]))
    .returning({ id: notifications.id })

  // 6. userProfiles — must come last; no FK children among the six tables
  const deletedUserProfiles = await staging
    .delete(userProfiles)
    .where(inArray(userProfiles.userId, [...fixtureUserIds]))
    .returning({ id: userProfiles.id })

  return {
    deleted: {
      submissionConfirms: deletedSubmissionConfirms.length,
      priceSubmissions: deletedPriceSubmissions.length,
      feedback: deletedFeedback.length,
      userEvents: deletedUserEvents.length,
      notifications: deletedNotifications.length,
      userProfiles: deletedUserProfiles.length,
    },
  }
}
