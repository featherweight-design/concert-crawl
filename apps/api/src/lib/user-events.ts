// Shared user_events write helpers.
//
// Watching and Attending share one user_events row (unique on user_id+event_id),
// so neither concern may unconditionally DELETE — un-watching a show you already
// committed to would erase the night from your Concert History (#70).

import { and, eq } from 'drizzle-orm'
import { db, userEvents } from '@concert-crawl/db'

export interface ReleaseWatchResult {
  /** True when the whole row was removed; false when only Watching was cleared. */
  deleted: boolean
}

/**
 * Drop the Watching relationship for one user+event, preserving attendance.
 *
 * No attendance on the row → DELETE it, so the table doesn't accumulate
 * tombstones. Attendance present → clear `status` and `savedPrice` only.
 */
export const releaseWatch = async (
  userId: string,
  eventId: string,
): Promise<ReleaseWatchResult> => {
  const [existing] = await db
    .select({ id: userEvents.id, attendingAt: userEvents.attendingAt })
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventId, eventId)))
    .limit(1)

  if (!existing) return { deleted: false }

  if (existing.attendingAt === null) {
    await db.delete(userEvents).where(eq(userEvents.id, existing.id))
    return { deleted: true }
  }

  await db
    .update(userEvents)
    .set({ status: null, savedPrice: null })
    .where(eq(userEvents.id, existing.id))
  return { deleted: false }
}

/**
 * Mirror of {@link releaseWatch} for the attendance side: drop the attendance,
 * preserving any Watching relationship on the row.
 */
export const releaseAttendance = async (
  userId: string,
  eventId: string,
): Promise<ReleaseWatchResult> => {
  const [existing] = await db
    .select({ id: userEvents.id, status: userEvents.status })
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventId, eventId)))
    .limit(1)

  if (!existing) return { deleted: false }

  if (existing.status === null) {
    await db.delete(userEvents).where(eq(userEvents.id, existing.id))
    return { deleted: true }
  }

  await db
    .update(userEvents)
    .set({ attendingAt: null })
    .where(eq(userEvents.id, existing.id))
  return { deleted: false }
}
