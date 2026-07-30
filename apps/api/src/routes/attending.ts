// apps/api/src/routes/attending.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, userEvents, events } from '@concert-crawl/db'
import type { AttendingToggleResponse } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { requireFeature } from '../middleware/entitlement.js'
import type { EntitlementVariables } from '../middleware/entitlement.js'
import { releaseAttendance } from '../lib/user-events.js'

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

  try {
    await db
      .insert(userEvents)
      .values({ userId: authInfo.userId, eventId, status: null, attendingAt })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        // status is deliberately absent: an existing watch must survive.
        set: { attendingAt },
      })
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'attendance upsert failed',
    )
    return ctx.json({ success: false, error: 'Failed to save attendance' }, 500)
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
