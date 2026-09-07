// apps/api/src/routes/attending.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db, userEvents, events } from '@concert-crawl/db'
import type { AttendingToggleResponse } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { requireFeature } from '../middleware/entitlement.js'
import type { EntitlementVariables } from '../middleware/entitlement.js'
import { releaseAttendance } from '../lib/user-events.js'
import { notifyCrewGoing } from '../lib/crew-notifications.js'

const uuidSchema = z.string().uuid()

// Returns null rather than throwing: this runs AFTER the attendance write has
// committed, so a transient read failure must not turn an action that already
// landed into a 500. The caller falls back to its own timestamp, which differs
// by milliseconds at worst.
const readAttendingAt = async (
  userId: string,
  eventId: string,
): Promise<Date | null> => {
  try {
    const [row] = await db
      .select({ attendingAt: userEvents.attendingAt })
      .from(userEvents)
      .where(
        and(eq(userEvents.userId, userId), eq(userEvents.eventId, eventId)),
      )
      .limit(1)
    return row?.attendingAt ?? null
  } catch (err) {
    apiLogger.warn(
      { err, userId, eventId },
      'attendance read-back failed; reporting the locally generated timestamp',
    )
    return null
  }
}

// Attending ("I'm going!") is what Concert History is built from — it is never
// derived from the watch list (#70 locked concept). Gated on the entitlement
// key, never a hardcoded tier: ENTITLEMENTS_MATRIX owns the tier answer.
export const attendingRouter = new Hono<{ Variables: EntitlementVariables }>()

attendingRouter.use('*', clerkMiddleware())
attendingRouter.use('*', requireFeature('concert-history'))

// PUT /v1/attending/:eventId — mark attendance. Idempotent: a second call
// leaves the original timestamp alone, so History keeps the moment the user
// actually committed.
attendingRouter.put('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('eventId'))
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)
  }
  const eventId = parsed.data

  // The consumer-visibility pair the event detail route applies: a delisted
  // event 404s there, so it must not be markable as a night you are going to.
  // Un-going lives on DELETE and is unaffected.
  const [eventRow] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )
    .limit(1)

  if (!eventRow) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  const [existing] = await db
    .select({ id: userEvents.id, attendingAt: userEvents.attendingAt })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.eventId, eventId),
      ),
    )
    .limit(1)

  if (existing?.attendingAt) {
    const response: AttendingToggleResponse = {
      going: true,
      attendingAt: existing.attendingAt.toISOString(),
    }
    return ctx.json({ success: true, data: response })
  }

  const attendingAt = new Date()

  // `claimed` is empty when a concurrent request won the transition. The
  // `existing` check above is a read-then-write and so cannot settle a double
  // tap on its own; this makes "who moved attendingAt off null" atomic, which
  // is what keeps the crew fan-out below to exactly one round per attendance.
  let claimed: { attendingAt: Date | null }[] = []
  try {
    claimed = await db
      .insert(userEvents)
      .values({ userId: authInfo.userId, eventId, status: null, attendingAt })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        // status is deliberately absent: an existing watch must survive.
        set: { attendingAt },
        setWhere: isNull(userEvents.attendingAt),
      })
      .returning({ attendingAt: userEvents.attendingAt })
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'attendance upsert failed',
    )
    return ctx.json({ success: false, error: 'Failed to save attendance' }, 500)
  }

  // Crew fan-out runs AFTER the upsert commits and never throws (#1226 PR-7).
  // Awaited rather than fired-and-forgotten so the row is visible to a client
  // that opens the bell immediately; the helper swallows its own failures, so
  // a notification problem cannot fail an attendance that already landed.
  // Only the request that actually won the transition fans out, so neither a
  // sequential re-tap nor two concurrent ones can notify a crew twice.
  if (claimed.length > 0) {
    await notifyCrewGoing({ actorUserId: authInfo.userId, eventId })
  }

  // A request that lost the race must report the timestamp that actually
  // persisted, not the one it generated, or two concurrent taps disagree about
  // when the user committed.
  const settledAt =
    claimed[0]?.attendingAt ?? (await readAttendingAt(authInfo.userId, eventId))

  const response: AttendingToggleResponse = {
    going: true,
    attendingAt: (settledAt ?? attendingAt).toISOString(),
  }
  return ctx.json({ success: true, data: response })
})

// DELETE /v1/attending/:eventId — undo attendance without disturbing a watch.
attendingRouter.delete('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('eventId'))
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)
  }

  await releaseAttendance(authInfo.userId, parsed.data)

  const response: AttendingToggleResponse = { going: false, attendingAt: null }
  return ctx.json({ success: true, data: response })
})
