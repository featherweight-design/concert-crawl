import { db, userEvents, userProfiles } from '@concert-crawl/db'
import { and, count, desc, eq, isNotNull, ne } from 'drizzle-orm'
import type { EventWatcher, EventWatchersResponse } from '@concert-crawl/types'

// Server-side LIMIT on the named roster. At beta scale (50-200 users) this
// never truncates; beyond it, extra named watchers fold into the anonymous
// tail — less specific, still honest.
export const ROSTER_CAP = 25

/**
 * Watchers of an event other than the viewer.
 *
 * `total` counts every other watcher, including those without a handle.
 * `named` lists only handle-bearing watchers — clearing your handle is the
 * opt-out mechanism. No user id, timestamp, or email crosses the wire.
 */
export async function getEventWatchers(
  eventId: string,
  viewerUserId: string,
): Promise<EventWatchersResponse> {
  const isOtherWatcher = and(
    eq(userEvents.eventId, eventId),
    eq(userEvents.status, 'watching'),
    ne(userEvents.userId, viewerUserId),
  )

  const [countRow] = await db
    .select({ total: count() })
    .from(userEvents)
    .where(isOtherWatcher)

  const rows = await db
    .select({
      handle: userProfiles.handle,
      avatarColor: userProfiles.avatarColor,
    })
    .from(userEvents)
    .innerJoin(userProfiles, eq(userEvents.userId, userProfiles.userId))
    .where(and(isOtherWatcher, isNotNull(userProfiles.handle)))
    .orderBy(desc(userEvents.createdAt))
    .limit(ROSTER_CAP)

  // Drizzle still types `handle` as nullable under isNotNull; narrow with a
  // guard rather than a cast.
  const named = rows.filter((row): row is EventWatcher => row.handle !== null)

  return { total: countRow?.total ?? 0, named }
}
