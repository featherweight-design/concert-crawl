/**
 * Concert Crawl — synthetic staging generator: notifications.
 *
 * Inserts notification rows covering both type enum values (`admin_alert` and
 * `user_notification`), a mix of `readAt = null` (unread) and a set timestamp
 * (read), and at least one long title + body per fixture user for layout
 * stress testing.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import { notifications } from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type GenResult = { inserted: number }

const ADMIN_ALERT_CATEGORIES = [
  'crawl.failed',
  'crawl.low_confidence',
  'crawl.blocked',
  'submission.dispute',
  'feedback.flagged',
] as const

const USER_NOTIFICATION_CATEGORIES = [
  'price.corroborated',
  'price.disputed',
  'event.reminder',
  'event.update',
] as const

const SHORT_TITLES = [
  'Crawl failed for Red Rocks',
  'New feedback flagged',
  'Price confirmed',
  'Event updated',
  'Submission disputed',
  'Crawl low confidence',
] as const

const SHORT_BODIES = [
  'The crawler encountered an error. Check the admin panel for details.',
  'A new feedback submission has been flagged for review.',
  'Your price submission was corroborated by another user.',
  'An event you are watching has been updated.',
  'Your submission has been disputed — review it in your account.',
  'The crawl completed with low confidence. Manual review may be needed.',
] as const

/** Long title (>80 chars) for layout stress testing. */
const LONG_TITLE =
  'Crawl failure detected at Red Rocks Amphitheatre — three consecutive errors, venue temporarily paused'

/** Long body for layout stress testing. */
const LONG_BODY =
  'The automated crawler encountered a series of consecutive failures while attempting to index the upcoming events at Red Rocks Amphitheatre. The venue has been temporarily paused from the crawl schedule to prevent further rate-limit exposure. Please review the crawl log in the admin panel, verify the venue configuration, and resume the crawl once the issue is resolved. If the venue has changed its web structure, a selector update or LLM extraction fallback may be required.'

/** A fixed past timestamp used for "read" notifications. */
const READ_AT = new Date('2026-07-01T10:00:00.000Z')

export const generateNotifications = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, rng } = deps

  type NotificationRow = typeof notifications.$inferInsert

  const rows: NotificationRow[] = []

  // --- Pinned rows: guarantee both type enum values appear ---

  // 1. admin_alert — unread.
  // Attributed to a fixture user (rather than nullable userId which real
  // system-broadcast alerts use) so cleanup-fixtures' inArray(userId, ...)
  // catches it on re-run. Nullable userId + inArray() = NULL IN (...) = NULL
  // (not TRUE), which would leak these rows across every run and violate
  // the seeder's delete-and-regenerate idempotency contract.
  rows.push({
    userId: rng.pick(fixtureUserIds),
    type: 'admin_alert',
    category: rng.pick(ADMIN_ALERT_CATEGORIES),
    title: rng.pick(SHORT_TITLES),
    body: rng.pick(SHORT_BODIES),
    actionUrl: 'https://concertcrawl.app/admin/crawl-log',
    readAt: null,
  })

  // 2. user_notification — read
  rows.push({
    userId: rng.pick(fixtureUserIds),
    type: 'user_notification',
    category: rng.pick(USER_NOTIFICATION_CATEGORIES),
    title: rng.pick(SHORT_TITLES),
    body: rng.pick(SHORT_BODIES),
    actionUrl: null,
    readAt: READ_AT,
  })

  // --- Per fixture user: one long-title/body notification + one short ---
  for (const userId of fixtureUserIds) {
    // Long-title + long-body layout stress row (readAt = null)
    rows.push({
      userId,
      type: 'user_notification',
      category: rng.pick(USER_NOTIFICATION_CATEGORIES),
      title: LONG_TITLE,
      body: LONG_BODY,
      actionUrl: 'https://concertcrawl.app/admin/venues',
      readAt: null,
    })

    // Short row with randomized read state. Derive category from the chosen
    // type so pairings stay coherent (admin_alert → admin categories only,
    // user_notification → user categories only). Independent picks would
    // produce nonsense like an admin_alert with category 'watch.reminder'
    // which confuses admin views that switch on category.
    const isRead = rng.int(0, 1) === 1
    const shortType = rng.pick(['admin_alert', 'user_notification'] as const)
    const shortCategory =
      shortType === 'admin_alert'
        ? rng.pick(ADMIN_ALERT_CATEGORIES)
        : rng.pick(USER_NOTIFICATION_CATEGORIES)
    rows.push({
      userId,
      type: shortType,
      category: shortCategory,
      title: rng.pick(SHORT_TITLES),
      body: rng.pick(SHORT_BODIES),
      actionUrl: null,
      readAt: isRead ? READ_AT : null,
    })
  }

  // --- Additional admin_alerts for volume (all attributed to fixture users
  //     for cleanup-catchability — see the pinned admin_alert comment above)
  const extraAlertCount = rng.int(2, 4)
  for (let idx = 0; idx < extraAlertCount; idx++) {
    rows.push({
      userId: rng.pick(fixtureUserIds),
      type: 'admin_alert',
      category: rng.pick(ADMIN_ALERT_CATEGORIES),
      title: rng.pick(SHORT_TITLES),
      body: rng.pick(SHORT_BODIES),
      actionUrl: 'https://concertcrawl.app/admin',
      readAt: rng.int(0, 1) === 1 ? READ_AT : null,
    })
  }

  await staging.insert(notifications).values(rows)

  return { inserted: rows.length }
}
