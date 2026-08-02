// apps/api/src/lib/prune-notifications.ts
// Retention prune for the consumer notification surface (#737).
//
// The three shipped fan-outs write one row per watcher, so `notifications` is
// the one table in this product whose growth is multiplied by audience size.
// Rows are kept for NOTIFICATION_RETENTION_DAYS (longer than the 30-day panel
// backfill, so a future digest still has the data) and deleted after.
//
// `admin_alert` rows are deliberately untouched — they are operator history
// with a different lifecycle and no fan-out multiplier.
import { and, eq, lt } from 'drizzle-orm'
import { notifications } from '@concert-crawl/db'
import type { Database } from '@concert-crawl/db'
import { apiLogger } from './logger.js'
import { NOTIFICATION_RETENTION_DAYS } from './definitions/notification-windows.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const pruneNotifications = async (
  database: Database,
  now: Date = new Date(),
): Promise<{ deleted: number }> => {
  const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS)
  // No `.returning()`: the driver's affected-row count is all this job needs,
  // and materializing one row per deletion would make the cron's memory scale
  // with a backlog it is specifically there to clear.
  const result = await database
    .delete(notifications)
    .where(
      and(
        eq(notifications.type, 'user_notification'),
        lt(notifications.createdAt, cutoff),
      ),
    )
  const deletedCount = result.count

  apiLogger.info(
    {
      deletedCount,
      retentionDays: NOTIFICATION_RETENTION_DAYS,
    },
    'prune-notifications: deleted user notifications past the retention window',
  )

  return { deleted: deletedCount }
}
