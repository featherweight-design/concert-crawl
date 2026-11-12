// apps/api/src/routes/attending.ts
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, userEvents, events } from '@concert-crawl/db';
import type { AttendingToggleResponse } from '@concert-crawl/types';
import { apiLogger } from '../lib/logger.js';
import { requireFeature } from '../middleware/entitlement.js';
import type { EntitlementVariables } from '../middleware/entitlement.js';
import { releaseAttendance } from '../lib/user-events.js';
import { notifyCrewGoing } from '../lib/crew-notifications.js';
import { idSchema } from '../lib/id-schema.js';
import { todayInDenver } from '../lib/time.js';
import {
  signRestoreToken,
  verifyRestoreToken,
} from '../lib/attendance-restore.js';

// The only body PUT accepts: an Undo of a removal, proven by the token the
// DELETE handed back. Strict, so a stray field is a 400 rather than ignored.
const putBodySchema = z
  .object({
    restore: z
      .object({
        attendingAt: z.iso.datetime(),
        token: z.string().min(1).max(200),
      })
      .strict()
      .optional(),
  })
  .strict();

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
      .limit(1);
    return row?.attendingAt ?? null;
  } catch (err) {
    apiLogger.warn(
      { err, userId, eventId },
      'attendance read-back failed; reporting the locally generated timestamp',
    );
    return null;
  }
};

// Attending ("I'm going!") is what Concert History is built from — it is never
// derived from the watch list (#70 locked concept). Gated on the entitlement
// key, never a hardcoded tier: ENTITLEMENTS_MATRIX owns the tier answer.
export const attendingRouter = new Hono<{ Variables: EntitlementVariables }>();

attendingRouter.use('*', clerkMiddleware());
attendingRouter.use('*', requireFeature('concert-history'));

// PUT /v1/attending/:eventId — mark attendance. Idempotent: a second call
// leaves the original timestamp alone, so History keeps the moment the user
// actually committed.
//
// A show dated before today (Mountain) is "I went": it may be marked even when
// the crawler stopped seeing it, a cancelled or hidden one is not markable, and
// it never pings the crew (they were told about the plan, not the memory). An
// optional `restore` puts back the attendance a DELETE just removed.
attendingRouter.put('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);

  const parsed = idSchema.safeParse(ctx.req.param('eventId'));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400);
  }
  const eventId = parsed.data;

  const rawBody = await ctx.req.text();
  let bodyJson: unknown = {};
  if (rawBody.trim() !== '') {
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return ctx.json({ success: false, error: 'Invalid body' }, 400);
    }
  }
  const body = putBodySchema.safeParse(bodyJson);
  if (!body.success) {
    return ctx.json({ success: false, error: 'Invalid body' }, 400);
  }
  const restore = body.data.restore;

  const [eventRow] = await db
    .select({
      date: events.date,
      status: events.status,
      firstMissingAt: events.firstMissingAt,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
    .limit(1);

  // An upcoming show keeps the strict #607 form: one the crawler stopped
  // seeing is not markable as a night you are going to, even once the stale
  // sweep brings it back on its detail page as No longer listed. A past one
  // happened whatever the crawler later did with the listing, so only a
  // cancelled show is refused. Same 404 as an unknown id either way.
  const isPast = eventRow !== undefined && eventRow.date < todayInDenver();
  const markable =
    eventRow !== undefined &&
    (isPast
      ? eventRow.status !== 'cancelled'
      : eventRow.firstMissingAt === null);

  if (!markable) {
    return ctx.json({ success: false, error: 'Event not found' }, 404);
  }

  if (
    restore &&
    !verifyRestoreToken({
      userId: authInfo.userId,
      eventId,
      attendingAt: restore.attendingAt,
      token: restore.token,
    })
  ) {
    return ctx.json({ success: false, error: 'Restore expired' }, 400);
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
    .limit(1);

  if (existing?.attendingAt) {
    const response: AttendingToggleResponse = {
      going: true,
      attendingAt: existing.attendingAt.toISOString(),
    };
    return ctx.json({ success: true, data: response });
  }

  const attendingAt = restore ? new Date(restore.attendingAt) : new Date();

  // `claimed` is empty when a concurrent request won the transition. The
  // `existing` check above is a read-then-write and so cannot settle a double
  // tap on its own; this makes "who moved attendingAt off null" atomic, which
  // is what keeps the crew fan-out below to exactly one round per attendance.
  let claimed: { attendingAt: Date | null }[] = [];
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
      .returning({ attendingAt: userEvents.attendingAt });
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'attendance upsert failed',
    );
    return ctx.json(
      { success: false, error: 'Failed to save attendance' },
      500,
    );
  }

  // Crew fan-out runs AFTER the upsert commits and never throws (#1226 PR-7).
  // Awaited rather than fired-and-forgotten so the row is visible to a client
  // that opens the bell immediately; the helper swallows its own failures, so
  // a notification problem cannot fail an attendance that already landed.
  // Only the request that actually won the transition fans out, so neither a
  // sequential re-tap nor two concurrent ones can notify a crew twice.
  // A past show or a restore is not news: the crew heard about the plan.
  if (claimed.length > 0 && !isPast && !restore) {
    await notifyCrewGoing({ actorUserId: authInfo.userId, eventId });
  }

  // A request that lost the race must report the timestamp that actually
  // persisted, not the one it generated, or two concurrent taps disagree about
  // when the user committed.
  const settledAt =
    claimed[0]?.attendingAt ??
    (await readAttendingAt(authInfo.userId, eventId));

  const response: AttendingToggleResponse = {
    going: true,
    attendingAt: (settledAt ?? attendingAt).toISOString(),
  };
  return ctx.json({ success: true, data: response });
});

// DELETE /v1/attending/:eventId — undo attendance without disturbing a watch.
attendingRouter.delete('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);

  const parsed = idSchema.safeParse(ctx.req.param('eventId'));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400);
  }

  const { removedAttendingAt } = await releaseAttendance(
    authInfo.userId,
    parsed.data,
  );

  const removedIso = removedAttendingAt?.toISOString() ?? null;
  const token =
    removedIso === null
      ? null
      : signRestoreToken({
          userId: authInfo.userId,
          eventId: parsed.data,
          attendingAt: removedIso,
        });

  const response: AttendingToggleResponse = {
    going: false,
    attendingAt: null,
    restore:
      removedIso !== null && token !== null
        ? { attendingAt: removedIso, token }
        : null,
  };
  return ctx.json({ success: true, data: response });
});
