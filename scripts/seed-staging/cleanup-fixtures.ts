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

import { inArray } from 'drizzle-orm'
import {
  feedback,
  notifications,
  priceSubmissions,
  submissionConfirms,
  userEvents,
  userProfiles,
} from '@concert-crawl/db'
import type { DrizzleWriteDb } from './sync-venues.js'

export async function cleanupFixtures(deps: {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
}): Promise<{ deleted: Record<string, number> }> {
  const { staging, fixtureUserIds } = deps

  // 1. submissionConfirms — child of priceSubmissions
  const deletedSubmissionConfirms = await staging
    .delete(submissionConfirms)
    .where(inArray(submissionConfirms.userId, [...fixtureUserIds]))
    .returning({ id: submissionConfirms.id })

  // 2. priceSubmissions — child of events; parent of submissionConfirms
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
