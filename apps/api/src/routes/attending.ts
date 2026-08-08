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

  const [eventRow] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
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
  let claimed: { id: string }[] = []
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
      .returning({ id: userEvents.id })
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

  const response: AttendingToggleResponse = {
    going: true,
    attendingAt: attendingAt.toISOString(),
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
