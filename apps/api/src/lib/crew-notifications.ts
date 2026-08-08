// apps/api/src/lib/crew-notifications.ts
//
// Concert Crews (#1226 PR-7) — the bell fan-out for crew activity.
//
// Modelled on contest-notifications.ts: every function here is called AFTER
// the triggering action has committed, never inside its transaction, and never
// throws. A failed notification insert is logged and swallowed, because the
// attendance / join / leave the user just performed is already durable and
// must not appear to roll back over a bell row.
//
// The three categories are bell-only by design (plan §3.11) — they are
// deliberately absent from PUSH_ELIGIBLE_CATEGORIES, so nothing here touches
// the push pipeline.
//
// Fan-out is bounded by the 12-member cap: at most 11 recipients per crew, and
// a person belongs to a handful of crews. One insert per call is sufficient and
// there is deliberately no batching layer.

import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm'
import {
  crewMembers,
  crewMutes,
  crews,
  db,
  events,
  notifications,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import type { UserNotificationCategory } from '@concert-crawl/push'
import { apiLogger } from './logger.js'
import {
  CREW_NOTIFICATION_ACTOR_FALLBACK,
  crewNotificationCopy,
} from './definitions/crew-notification-copy.js'

/** One resolved recipient, already attributed to the crew that will show. */
interface CrewRecipient {
  userId: string
  crewId: string
  crewName: string
  patchSalt: number
}

/**
 * The metadata blob every crew row carries. The panel reads `crewId` and
 * `patchSalt` to draw the micro patch and `crewName` for the eyebrow, so all
 * three are denormalized here rather than re-fetched per row at render time.
 */
interface CrewNotificationMetadata {
  crewId: string
  crewName: string
  patchSalt: number
  category: UserNotificationCategory
  eventId?: string
}

/**
 * The actor's handle, falling back to "Someone" when they have not picked one.
 * Never invented: that fallback is the same string the invite landing uses.
 */
const loadActorName = async (userId: string): Promise<string> => {
  const [row] = await db
    .select({ handle: userProfiles.handle })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)
  return row?.handle ?? CREW_NOTIFICATION_ACTOR_FALLBACK
}

/**
 * Every member of `crewIds` other than the actor, with anyone holding a
 * `crew_mutes` row for that crew dropped (plan D5 — mute suppresses at write
 * time, so a muted crew never produces a row to hide later).
 *
 * Ordering is fully determined (`crews.name`, then `crews.id`, then user id)
 * so the dedupe below picks the same crew for the same person on every run.
 * Names tie freely, hence the id tie-break.
 */
const loadRecipients = async (
  crewIds: string[],
  actorUserId: string,
): Promise<CrewRecipient[]> => {
  if (crewIds.length === 0) return []

  const rows = await db
    .select({
      userId: crewMembers.userId,
      crewId: crews.id,
      crewName: crews.name,
      patchSalt: crews.patchSalt,
    })
    .from(crewMembers)
    .innerJoin(crews, eq(crews.id, crewMembers.crewId))
    .leftJoin(
      crewMutes,
      and(
        eq(crewMutes.crewId, crewMembers.crewId),
        eq(crewMutes.userId, crewMembers.userId),
      ),
    )
    .where(
      and(
        inArray(crewMembers.crewId, crewIds),
        ne(crewMembers.userId, actorUserId),
        isNull(crewMutes.id),
      ),
    )
    .orderBy(asc(crews.name), asc(crews.id), asc(crewMembers.userId))

  // Dedupe across crews: sharing three crews with the actor is still one
  // notification. The first crew in the deterministic order above is the one
  // named on the row.
  const seen = new Map<string, CrewRecipient>()
  for (const row of rows) {
    if (seen.has(row.userId)) continue
    seen.set(row.userId, row)
  }
  return [...seen.values()]
}

const insertRows = async (
  rows: (typeof notifications.$inferInsert)[],
  context: Record<string, unknown>,
): Promise<{ written: number }> => {
  if (rows.length === 0) return { written: 0 }
  try {
    await db.insert(notifications).values(rows)
    return { written: rows.length }
  } catch (notifyErr) {
    apiLogger.warn(
      { ...context, err: notifyErr },
      'Failed to write crew notifications; the triggering action already committed.',
    )
    return { written: 0 }
  }
}

const buildMetadata = (
  recipient: CrewRecipient,
  category: UserNotificationCategory,
  eventId?: string,
): string => {
  const metadata: CrewNotificationMetadata = {
    crewId: recipient.crewId,
    crewName: recipient.crewName,
    patchSalt: recipient.patchSalt,
    category,
    ...(eventId === undefined ? {} : { eventId }),
  }
  return JSON.stringify(metadata)
}

/**
 * `crew.going` — someone marked attendance, so everyone they share a crew with
 * hears about it once. Call AFTER the attendance row commits.
 */
export async function notifyCrewGoing(input: {
  actorUserId: string
  eventId: string
}): Promise<{ written: number }> {
  try {
    const myCrews = await db
      .select({ crewId: crewMembers.crewId })
      .from(crewMembers)
      .where(eq(crewMembers.userId, input.actorUserId))
    if (myCrews.length === 0) return { written: 0 }

    const [recipients, eventRow, actorName] = await Promise.all([
      loadRecipients(
        myCrews.map((row) => row.crewId),
        input.actorUserId,
      ),
      db
        .select({ artist: events.artist, venue: venues.name })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(events.id, input.eventId))
        .limit(1),
      loadActorName(input.actorUserId),
    ])
    if (recipients.length === 0) return { written: 0 }

    const context = eventRow[0]
    if (!context) return { written: 0 }
    const artistAtVenue =
      context.venue === null
        ? context.artist
        : `${context.artist} at ${context.venue}`
    const copy = crewNotificationCopy.going(actorName, artistAtVenue)

    return await insertRows(
      recipients.map((recipient) => ({
        userId: recipient.userId,
        type: 'user_notification' as const,
        category: 'crew.going',
        title: copy.title,
        body: copy.body,
        actionUrl: `/events/${input.eventId}`,
        metadata: buildMetadata(recipient, 'crew.going', input.eventId),
      })),
      { actorUserId: input.actorUserId, eventId: input.eventId },
    )
  } catch (fanoutErr) {
    apiLogger.warn(
      {
        actorUserId: input.actorUserId,
        eventId: input.eventId,
        err: fanoutErr,
      },
      'crew.going fan-out failed; attendance already committed.',
    )
    return { written: 0 }
  }
}

/**
 * `crew.joined` / `crew.left` — a membership change in one crew, told to the
 * people still in it. Call AFTER the membership transaction commits; on a
 * leave the actor's row is already gone, so they cannot notify themselves.
 */
export async function notifyCrewMembershipChange(input: {
  actorUserId: string
  crewId: string
  action: 'joined' | 'left'
}): Promise<{ written: number }> {
  try {
    const [recipients, actorName] = await Promise.all([
      loadRecipients([input.crewId], input.actorUserId),
      loadActorName(input.actorUserId),
    ])
    if (recipients.length === 0) return { written: 0 }

    const category: UserNotificationCategory =
      input.action === 'joined' ? 'crew.joined' : 'crew.left'

    return await insertRows(
      recipients.map((recipient) => {
        const copy =
          input.action === 'joined'
            ? crewNotificationCopy.joined(actorName, recipient.crewName)
            : crewNotificationCopy.left(actorName, recipient.crewName)
        return {
          userId: recipient.userId,
          type: 'user_notification' as const,
          category,
          title: copy.title,
          body: copy.body,
          actionUrl: `/crews/${input.crewId}`,
          metadata: buildMetadata(recipient, category),
        }
      }),
      { actorUserId: input.actorUserId, crewId: input.crewId, category },
    )
  } catch (fanoutErr) {
    apiLogger.warn(
      {
        actorUserId: input.actorUserId,
        crewId: input.crewId,
        action: input.action,
        err: fanoutErr,
      },
      'crew membership fan-out failed; the membership change already committed.',
    )
    return { written: 0 }
  }
}
