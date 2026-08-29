import { Hono } from 'hono'
import { z } from 'zod'
import { and, eq, exists, isNull, sql } from 'drizzle-orm'
import { db, events, priceSubmissions, venues } from '@concert-crawl/db'
import { STALE_AFTER_MS } from '@concert-crawl/types'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'

const uuidSchema = z.string().uuid()

export const priceSubmissionStillAccurateRouter = new Hono()

// The event must be reachable the same way event detail reaches it: not
// hidden, not lost by the crawler, and on an active venue. events.ts:615-632
// gets there through an inner join on `venues.active`, so a deactivated venue
// removes a whole catalogue from view without touching an event row.
function visibleEventPredicate(eventId: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(events)
      .innerJoin(
        venues,
        and(eq(venues.id, events.venueId), eq(venues.active, true)),
      )
      .where(
        and(
          eq(events.id, eventId),
          eq(events.id, priceSubmissions.eventId),
          eq(events.hiddenFromConsumer, false),
          isNull(events.firstMissingAt),
        ),
      ),
  )
}

// POST /v1/events/:id/price-submissions/:submissionId/still-accurate
//
// No body validator: the handler reads nothing but the path, matching the two
// sibling path-only consumer POSTs (artist-follows.ts:56-59,
// event-reports.ts:274-278). Path params are safeParse'd inline the way the
// consumer routes do it (attending.ts:58, watching.ts:125-126).
priceSubmissionStillAccurateRouter.post(
  '/:id/price-submissions/:submissionId/still-accurate',
  clerkAuth,
  requireAuth,
  async (ctx) => {
    const parsedEventId = uuidSchema.safeParse(ctx.req.param('id'))
    if (!parsedEventId.success) {
      return ctx.json({ success: false, error: 'Invalid event ID' }, 400)
    }
    const parsedSubmissionId = uuidSchema.safeParse(
      ctx.req.param('submissionId'),
    )
    if (!parsedSubmissionId.success) {
      return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
    }
    const eventId = parsedEventId.data
    const submissionId = parsedSubmissionId.data
    const { userId } = getAuthUser(ctx)

    // The staleness check IS the cooldown, so it has to be the same statement
    // as the write — a read-then-update lets two concurrent callers both
    // observe the stale value and both succeed.
    //
    // Postgres `GREATEST` skips null arguments and returns null only when
    // every argument is null — the opposite of Oracle and of the SQL standard,
    // and a reliable source of "this needs a COALESCE" review comments. It
    // does not: a never-sighted row compares on `created_at` already, which is
    // what the first-sighting acceptance test covers. Wrapping `last_seen_at`
    // in COALESCE would reintroduce exactly the coalesce-not-max bug the read
    // side had, since it would ignore `created_at` whenever a sighting exists.
    const updated = await db
      .update(priceSubmissions)
      .set({ lastSeenAt: sql`now()`, lastSeenBy: userId })
      .where(
        and(
          eq(priceSubmissions.id, submissionId),
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.status, 'corroborated'),
          sql`greatest(${priceSubmissions.lastSeenAt}, ${priceSubmissions.createdAt}) < now() - make_interval(secs => ${STALE_AFTER_MS} / 1000.0)`,
          visibleEventPredicate(eventId),
        ),
      )
      .returning({ lastSeenAt: priceSubmissions.lastSeenAt })

    const [stamped] = updated
    if (stamped) {
      return ctx.json({
        success: true,
        data: { lastSeenAt: stamped.lastSeenAt?.toISOString() ?? null },
      })
    }

    // A zero row count says "no", not "why". This second read is not
    // authoritative — the conditional update above is the only success gate —
    // it only picks the status code, in the same order the guards are
    // specified. It re-applies the event and visibility predicates so a row
    // that moved events, or an event that just went hidden, is not classified
    // as 400/409 and thereby confirmed to exist.
    const [visibleEvent] = await db
      .select({ id: events.id })
      .from(events)
      .innerJoin(
        venues,
        and(eq(venues.id, events.venueId), eq(venues.active, true)),
      )
      .where(
        and(
          eq(events.id, eventId),
          eq(events.hiddenFromConsumer, false),
          isNull(events.firstMissingAt),
        ),
      )
      .limit(1)

    if (!visibleEvent) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    const [submission] = await db
      .select({ status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.id, submissionId),
          eq(priceSubmissions.eventId, eventId),
        ),
      )
      .limit(1)

    if (!submission) {
      return ctx.json({ success: false, error: 'Submission not found' }, 404)
    }

    if (submission.status !== 'corroborated') {
      return ctx.json(
        { success: false, error: 'Submission is not corroborated' },
        400,
      )
    }

    return ctx.json(
      { success: false, error: 'This price was already marked recently' },
      409,
    )
  },
)
