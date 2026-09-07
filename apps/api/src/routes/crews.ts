// apps/api/src/routes/crews.ts
//
// Concert Crews (#1226) — the crews router. A crew is a lens on your people,
// not a per-event roll-call, so nothing here writes an attendance signal:
// crew shows are derived from the shipped user_events.attending_at (plan D1).
//
// Entitlement placement is deliberate and load-bearing: requireFeature('crews')
// gates POST / and NOTHING else. Reading, leaving, and muting stay open on
// every plan, which is how a lapsed creator keeps every crew they already made
// (plan D6). Do not "fix" the apparent gap by gating the reads.

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  crewInvites,
  crewMembers,
  crewMutes,
  crews,
  db,
  userProfiles,
} from '@concert-crawl/db'
import type {
  CrewDetail,
  CrewInvite,
  CrewMember,
  CrewMemberPreview,
  CrewSummary,
  EventCrewGoing,
} from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { requireFlag } from '../middleware/feature-flag.js'
import { requireFeature } from '../middleware/entitlement.js'
import type { EntitlementVariables } from '../middleware/entitlement.js'
import {
  loadCrewGoingForEvent,
  loadCrewShows,
  loadUpcomingCounts,
} from '../lib/crew-shows.js'
import {
  CREW_CLUSTER_SIZE,
  CREW_DUPLICATE_ID_CODE,
  CREW_HANDOFF_REQUIRED_CODE,
  CREW_LAST_MEMBER_CODE,
  countMembers,
  isMember,
  lockCrew,
} from '../lib/crews.js'
import {
  CREW_INVITE_TTL_MS,
  generateCrewInviteToken,
} from '../lib/crew-invite-token.js'
import { PG_UNIQUE_VIOLATION } from '../lib/pg-errors.js'
import { notifyCrewMembershipChange } from '../lib/crew-notifications.js'

const uuidSchema = z.string().uuid()
const nameSchema = z.string().trim().min(1).max(40)

const createBodySchema = z.object({
  // Client-suppliable so the create sheet's patch preview is truthful: the
  // patch is seeded from the id, so a server-minted id would make the preview
  // a lie. Safe because the id is not a capability — the invite token is
  // (plan D2).
  id: uuidSchema.optional(),
  name: nameSchema,
})

// Clerk user ids, which are opaque strings rather than uuids. Bounded so
// garbage of arbitrary length never reaches the DB layer.
const userIdSchema = z.string().trim().min(1).max(255)

const renameBodySchema = z.object({ name: nameSchema })
const handoffBodySchema = z.object({ newKeeperId: userIdSchema })

// Drizzle wraps the postgres-js error, so the SQLSTATE may sit on the error or
// on its cause. Mirrors the both-places check in lib/pg-errors.ts.
const isUniqueViolation = (err: unknown): boolean => {
  const matches = (candidate: unknown): boolean =>
    typeof candidate === 'object' &&
    candidate !== null &&
    'code' in candidate &&
    Reflect.get(candidate, 'code') === PG_UNIQUE_VIOLATION
  if (matches(err)) return true
  return err instanceof Error && 'cause' in err ? matches(err.cause) : false
}

export const crewsRouter = new Hono<{ Variables: EntitlementVariables }>()

// Release gate. Mounted first so a flagged-off crews API answers 404 and never
// the 403 that requireFeature('crews') would give, which would advertise a
// feature customers cannot reach.
crewsRouter.use('*', requireFlag('crews'))

crewsRouter.use('*', clerkMiddleware())

// GET /v1/crews — every crew the caller belongs to.
crewsRouter.get('/', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const myRows = await db
    .select({ crewId: crewMembers.crewId })
    .from(crewMembers)
    .where(eq(crewMembers.userId, userId))

  const crewIds = myRows.map((row) => row.crewId)
  if (crewIds.length === 0) {
    return ctx.json({ success: true, data: { crews: [] } })
  }

  const [crewRows, memberRows, mutedRows, upcomingCounts] = await Promise.all([
    db
      .select({
        id: crews.id,
        name: crews.name,
        patchSalt: crews.patchSalt,
        keeperId: crews.keeperId,
      })
      .from(crews)
      .where(inArray(crews.id, crewIds))
      // Stable and rename-proof. Alphabetical would reshuffle the whole list
      // the moment a keeper renames one crew.
      .orderBy(asc(crews.createdAt), asc(crews.id)),
    db
      .select({
        crewId: crewMembers.crewId,
        userId: crewMembers.userId,
        joinedAt: crewMembers.joinedAt,
        handle: userProfiles.handle,
        avatarColor: userProfiles.avatarColor,
      })
      .from(crewMembers)
      .leftJoin(userProfiles, eq(userProfiles.userId, crewMembers.userId))
      .where(inArray(crewMembers.crewId, crewIds))
      // joinedAt alone ties whenever two people accept in the same transaction
      // or the same clock tick, and the cluster then reshuffles between
      // requests. userId breaks the tie deterministically.
      .orderBy(asc(crewMembers.joinedAt), asc(crewMembers.userId)),
    db
      .select({ crewId: crewMutes.crewId })
      .from(crewMutes)
      .where(
        and(inArray(crewMutes.crewId, crewIds), eq(crewMutes.userId, userId)),
      ),
    loadUpcomingCounts(crewIds),
  ])

  const membersByCrew = new Map<string, CrewMemberPreview[]>()
  for (const row of memberRows) {
    const list = membersByCrew.get(row.crewId) ?? []
    list.push({
      userId: row.userId,
      handle: row.handle ?? null,
      avatarColor: row.avatarColor ?? null,
    })
    membersByCrew.set(row.crewId, list)
  }
  const mutedIds = new Set(mutedRows.map((row) => row.crewId))

  const summaries: CrewSummary[] = crewRows.map((crew) => {
    const members = membersByCrew.get(crew.id) ?? []
    return {
      id: crew.id,
      name: crew.name,
      patchSalt: crew.patchSalt,
      memberCount: members.length,
      members: members.slice(0, CREW_CLUSTER_SIZE),
      upcomingCount: upcomingCounts.get(crew.id) ?? 0,
      isKeeper: crew.keeperId === userId,
      muted: mutedIds.has(crew.id),
    }
  })

  return ctx.json({ success: true, data: { crews: summaries } })
})

// POST /v1/crews — the one entitlement-gated route in this file (plan D6).
crewsRouter.post('/', requireFeature('crews'), async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const raw: unknown = await ctx.req.json().catch(() => null)
  const parsed = createBodySchema.safeParse(raw)
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid crew' }, 400)
  }

  try {
    // The crew and the creator's membership land together: a crew with no
    // members would be unreachable forever.
    const created = await db.transaction(async (tx) => {
      const [crew] = await tx
        .insert(crews)
        .values({
          ...(parsed.data.id ? { id: parsed.data.id } : {}),
          name: parsed.data.name,
          keeperId: userId,
          // Never set from user input. It moves only on an explicit reroll.
          patchSalt: 0,
        })
        .returning()
      if (!crew) throw new Error('crew insert returned no rows')
      await tx.insert(crewMembers).values({ crewId: crew.id, userId })
      return crew
    })

    // Hydrated rather than hard-coded null: the creator is looking at their own
    // crew the instant this returns, and a null preview renders them as an
    // anonymous avatar until the list refetches contradicts it.
    const [profile] = await db
      .select({
        handle: userProfiles.handle,
        avatarColor: userProfiles.avatarColor,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    const summary: CrewSummary = {
      id: created.id,
      name: created.name,
      patchSalt: created.patchSalt,
      memberCount: 1,
      members: [
        {
          userId,
          handle: profile?.handle ?? null,
          avatarColor: profile?.avatarColor ?? null,
        },
      ],
      upcomingCount: 0,
      isKeeper: true,
      muted: false,
    }
    return ctx.json({ success: true, data: { crew: summary } }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      // A retried POST carrying the same client-minted id is idempotent by
      // rejection rather than by minting a second crew (plan D2). Handled, so
      // it logs at info: a burst of these is a client retry loop worth seeing,
      // not an error worth paging on.
      apiLogger.info({ userId }, 'crew create rejected as duplicate')
      return ctx.json(
        {
          success: false,
          error: 'That crew already exists',
          code: CREW_DUPLICATE_ID_CODE,
        },
        409,
      )
    }
    apiLogger.warn({ err, userId }, 'crew create failed')
    return ctx.json({ success: false, error: 'Failed to create crew' }, 500)
  }
})

/**
 * Membership is the authorization boundary for every read. Resolves the crew
 * only when the caller belongs to it. Callers answer 403 for both a missing
 * crew and a non-member, so crew ids are not probeable.
 */
const resolveMembership = async (
  crewId: string,
  userId: string,
): Promise<{
  id: string
  name: string
  patchSalt: number
  keeperId: string
} | null> => {
  const [row] = await db
    .select({
      id: crews.id,
      name: crews.name,
      patchSalt: crews.patchSalt,
      keeperId: crews.keeperId,
    })
    .from(crews)
    .innerJoin(crewMembers, eq(crewMembers.crewId, crews.id))
    .where(and(eq(crews.id, crewId), eq(crewMembers.userId, userId)))
    .limit(1)
  return row ?? null
}

// GET /v1/crews/:crewId — the crew home.
crewsRouter.get('/:crewId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)
  const crewId = parsed.data

  // 403 whether or not the crew exists. Membership is the authorization
  // boundary for every read, and a uniform answer keeps crew ids unprobeable.
  const crew = await resolveMembership(crewId, userId)
  if (!crew)
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  const memberRows = await db
    .select({
      userId: crewMembers.userId,
      joinedAt: crewMembers.joinedAt,
      handle: userProfiles.handle,
      avatarColor: userProfiles.avatarColor,
    })
    .from(crewMembers)
    .leftJoin(userProfiles, eq(userProfiles.userId, crewMembers.userId))
    .where(eq(crewMembers.crewId, crewId))
    .orderBy(asc(crewMembers.joinedAt), asc(crewMembers.userId))

  const memberIds = memberRows.map((row) => row.userId)
  const [upcoming, nights, mute] = await Promise.all([
    loadCrewShows(memberIds, 'upcoming'),
    loadCrewShows(memberIds, 'past'),
    db
      .select({ id: crewMutes.id })
      .from(crewMutes)
      .where(and(eq(crewMutes.crewId, crewId), eq(crewMutes.userId, userId)))
      .limit(1),
  ])

  const members: CrewMember[] = memberRows.map((row) => ({
    userId: row.userId,
    handle: row.handle ?? null,
    avatarColor: row.avatarColor ?? null,
    joinedAt: row.joinedAt.toISOString(),
    isKeeper: row.userId === crew.keeperId,
    isYou: row.userId === userId,
  }))

  const detail: CrewDetail = {
    id: crew.id,
    name: crew.name,
    patchSalt: crew.patchSalt,
    memberCount: members.length,
    isKeeper: crew.keeperId === userId,
    muted: mute.length > 0,
    members,
    upcoming,
    nights,
  }

  return ctx.json({ success: true, data: detail })
})

// GET /v1/crews/event-going/:eventId — who among your crews is going to one
// event. Registered above the `/:crewId/...` patterns so the static first
// segment is never read as a crew id. Not scoped to a crew on purpose: event
// detail asks "do I know anyone going", which is a question about you, not
// about one crew.
crewsRouter.get('/event-going/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('eventId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)

  const going = await loadCrewGoingForEvent(authInfo.userId, parsed.data)
  const payload: EventCrewGoing = { count: going.length, going }
  return ctx.json({ success: true, data: payload })
})

// GET /v1/crews/:crewId/shows — the Browse lens feed. Same upcoming predicate
// as the crew home, so the lens is a filter over the existing list rather than
// a parallel event model. Row surfaces render `goingCount`; the names are
// event-detail-only (locked decision 5).
crewsRouter.get('/:crewId/shows', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const crew = await resolveMembership(parsed.data, userId)
  if (!crew)
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  const memberRows = await db
    .select({ userId: crewMembers.userId })
    .from(crewMembers)
    .where(eq(crewMembers.crewId, parsed.data))

  const shows = await loadCrewShows(
    memberRows.map((row) => row.userId),
    'upcoming',
  )
  return ctx.json({ success: true, data: { shows } })
})

/**
 * The keeper gate for rename, reroll, remove, and delete. A non-member gets
 * 404 and a non-keeper member gets 403, so a stranger cannot tell "this crew
 * exists and you're not the keeper" from "no such crew".
 */
const requireKeeper = async (
  crewId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> => {
  const [crew] = await db
    .select({ keeperId: crews.keeperId })
    .from(crews)
    .where(eq(crews.id, crewId))
    .limit(1)
  if (!crew) return { ok: false, status: 404 }
  if (!(await isMember(db, crewId, userId))) return { ok: false, status: 404 }
  if (crew.keeperId !== userId) return { ok: false, status: 403 }
  return { ok: true }
}

const keeperDenied = (status: 403 | 404) =>
  status === 404
    ? ({ success: false, error: 'Crew not found' } as const)
    : ({ success: false, error: 'Only the keeper can do that' } as const)

/**
 * requireKeeper runs as its own statement, so a concurrent handoff or delete
 * can land between the check and the write. Every keeper-gated write therefore
 * repeats the keeper predicate in its own WHERE clause, which folds the check
 * and the write into one statement and needs no transaction. Zero rows
 * affected means the crew went away or the caller stopped being its keeper.
 */
const keeperOwns = (crewId: string, userId: string) =>
  and(eq(crews.id, crewId), eq(crews.keeperId, userId))

// Deliberately the same answer requireKeeper gives a non-member: a caller who
// lost the race learns only that they can no longer act on this crew.
const keeperRaceLost = { success: false, error: 'Crew not found' } as const

// PATCH /v1/crews/:crewId — rename. Deliberately does NOT touch patchSalt:
// renaming a crew must never move its artwork, which is the mental model the
// whole identity system rests on.
crewsRouter.patch('/:crewId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const idParsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!idParsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const raw: unknown = await ctx.req.json().catch(() => null)
  const bodyParsed = renameBodySchema.safeParse(raw)
  if (!bodyParsed.success)
    return ctx.json({ success: false, error: 'Invalid name' }, 400)

  const gate = await requireKeeper(idParsed.data, authInfo.userId)
  if (!gate.ok) return ctx.json(keeperDenied(gate.status), gate.status)

  const [updated] = await db
    .update(crews)
    .set({ name: bodyParsed.data.name, updatedAt: new Date() })
    .where(keeperOwns(idParsed.data, authInfo.userId))
    .returning({
      id: crews.id,
      name: crews.name,
      patchSalt: crews.patchSalt,
    })

  // The gate above and this UPDATE are separate statements, so a concurrent
  // delete can land between them. Without this the response would omit `crew`.
  if (!updated) return ctx.json(keeperRaceLost, 404)

  return ctx.json({ success: true, data: { crew: updated } })
})

// POST /v1/crews/:crewId/patch/reroll — server-side increment. The client
// never supplies a salt; it only asks for the next one.
crewsRouter.post('/:crewId/patch/reroll', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const gate = await requireKeeper(parsed.data, authInfo.userId)
  if (!gate.ok) return ctx.json(keeperDenied(gate.status), gate.status)

  const [updated] = await db
    .update(crews)
    .set({ patchSalt: sql`${crews.patchSalt} + 1`, updatedAt: new Date() })
    .where(keeperOwns(parsed.data, authInfo.userId))
    .returning({
      id: crews.id,
      name: crews.name,
      patchSalt: crews.patchSalt,
    })

  if (!updated) return ctx.json(keeperRaceLost, 404)

  return ctx.json({ success: true, data: { crew: updated } })
})

// DELETE /v1/crews/:crewId/members/:memberId — keeper removes someone else.
crewsRouter.delete('/:crewId/members/:memberId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const memberParsed = userIdSchema.safeParse(ctx.req.param('memberId'))
  if (!memberParsed.success)
    return ctx.json({ success: false, error: 'Invalid member ID' }, 400)
  const memberId = memberParsed.data

  const gate = await requireKeeper(parsed.data, authInfo.userId)
  if (!gate.ok) return ctx.json(keeperDenied(gate.status), gate.status)

  if (memberId === authInfo.userId) {
    // The keeper's own exit is leave + handoff, which carries the "pass it on
    // first" rule. Letting remove double as it would route around that.
    return ctx.json(
      {
        success: false,
        error: 'The keeper leaves by handing the crew on',
        code: CREW_HANDOFF_REQUIRED_CODE,
      },
      409,
    )
  }

  // The write lands on crew_members, so the keeper predicate cannot ride along
  // in its WHERE the way it does for the crews writes above. Re-check
  // keeper-ness under the crew row lock instead, which closes the same race.
  const removed = await db.transaction(async (tx) => {
    const locked = await lockCrew(tx, parsed.data)
    if (!locked || locked.keeperId !== authInfo.userId) return null
    return tx
      .delete(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, parsed.data),
          eq(crewMembers.userId, memberId),
        ),
      )
      .returning({ id: crewMembers.id })
  })

  if (removed === null) return ctx.json(keeperRaceLost, 404)

  if (removed.length === 0)
    return ctx.json({ success: false, error: 'Not a member' }, 404)

  return ctx.json({ success: true, data: { removed: true } })
})

// DELETE /v1/crews/:crewId — cascade clears members, invites, and mutes.
// Attendance rows in user_events are untouched: the nights you went stay in
// your Concerts.
crewsRouter.delete('/:crewId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const gate = await requireKeeper(parsed.data, authInfo.userId)
  if (!gate.ok) return ctx.json(keeperDenied(gate.status), gate.status)

  const deleted = await db
    .delete(crews)
    .where(keeperOwns(parsed.data, authInfo.userId))
    .returning({ id: crews.id })

  if (deleted.length === 0) return ctx.json(keeperRaceLost, 404)

  return ctx.json({ success: true, data: { deleted: true } })
})

// POST /v1/crews/:crewId/leave — un-gated on every plan (plan D6).
crewsRouter.post('/:crewId/leave', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)
  const crewId = parsed.data

  const result = await db.transaction(async (tx) => {
    const crew = await lockCrew(tx, crewId)
    if (!crew) return { kind: 'missing' } as const
    if (!(await isMember(tx, crewId, userId)))
      return { kind: 'missing' } as const

    if (crew.keeperId === userId) {
      const total = await countMembers(tx, crewId)
      // The server refuses; the client does not get to skip the step
      // (locked decision 7).
      return total > 1
        ? ({ kind: 'handoff' } as const)
        : ({ kind: 'last' } as const)
    }

    await tx
      .delete(crewMembers)
      .where(
        and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)),
      )
    return { kind: 'left' } as const
  })

  if (result.kind === 'missing')
    return ctx.json({ success: false, error: 'Crew not found' }, 404)
  if (result.kind === 'handoff')
    return ctx.json(
      {
        success: false,
        error: 'Pass the crew on before you go',
        code: CREW_HANDOFF_REQUIRED_CODE,
      },
      409,
    )
  if (result.kind === 'last')
    return ctx.json(
      {
        success: false,
        // Deletion stays an explicit second call.
        error: "You're the last one here",
        code: CREW_LAST_MEMBER_CODE,
      },
      409,
    )

  // After the delete committed (#1226 PR-7). The actor's membership row is
  // already gone, so the recipient query cannot notify them of their own exit.
  await notifyCrewMembershipChange({
    actorUserId: userId,
    crewId,
    action: 'left',
  })

  return ctx.json({ success: true, data: { left: true } })
})

// POST /v1/crews/:crewId/handoff — keeper only; the target must be a member.
crewsRouter.post('/:crewId/handoff', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const idParsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!idParsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const raw: unknown = await ctx.req.json().catch(() => null)
  const bodyParsed = handoffBodySchema.safeParse(raw)
  if (!bodyParsed.success)
    return ctx.json({ success: false, error: 'Invalid new keeper' }, 400)

  const gate = await requireKeeper(idParsed.data, authInfo.userId)
  if (!gate.ok) return ctx.json(keeperDenied(gate.status), gate.status)

  const { newKeeperId } = bodyParsed.data

  // The whole thing runs under the crew row lock, which is the same lock
  // POST /leave takes. Without it the incoming keeper can leave between the
  // membership check and the UPDATE, stranding the crew with a keeper who is
  // not a member and so can never pass requireKeeper again.
  const result = await db.transaction(async (tx) => {
    const locked = await lockCrew(tx, idParsed.data)
    if (!locked || locked.keeperId !== authInfo.userId)
      return { kind: 'race' } as const
    if (!(await isMember(tx, idParsed.data, newKeeperId)))
      return { kind: 'not-a-member' } as const

    const [updated] = await tx
      .update(crews)
      .set({ keeperId: newKeeperId, updatedAt: new Date() })
      .where(keeperOwns(idParsed.data, authInfo.userId))
      .returning({
        id: crews.id,
        name: crews.name,
        patchSalt: crews.patchSalt,
        keeperId: crews.keeperId,
      })

    return updated
      ? ({ kind: 'done', updated } as const)
      : ({ kind: 'race' } as const)
  })

  if (result.kind === 'race') return ctx.json(keeperRaceLost, 404)
  if (result.kind === 'not-a-member')
    return ctx.json(
      { success: false, error: 'That person is not in this crew' },
      400,
    )

  return ctx.json({ success: true, data: { crew: result.updated } })
})

// PUT/DELETE /v1/crews/:crewId/mute — member-only, not keeper-only. Mute
// suppresses at write time (plan D5): a muted crew writes no notification rows
// at all, so unmuting surfaces what happens next rather than a backlog.
crewsRouter.put('/:crewId/mute', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const crew = await resolveMembership(parsed.data, authInfo.userId)
  if (!crew)
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  await db
    .insert(crewMutes)
    .values({ crewId: parsed.data, userId: authInfo.userId })
    .onConflictDoNothing()

  return ctx.json({ success: true, data: { muted: true } })
})

crewsRouter.delete('/:crewId/mute', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const crew = await resolveMembership(parsed.data, authInfo.userId)
  if (!crew)
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  await db
    .delete(crewMutes)
    .where(
      and(
        eq(crewMutes.crewId, parsed.data),
        eq(crewMutes.userId, authInfo.userId),
      ),
    )

  return ctx.json({ success: true, data: { muted: false } })
})

// --- Invites (PR-3) -------------------------------------------------------
//
// Minting, reading, and retiring the link are all member-level, not
// keeper-level: there is no gatekeeping to do inside a group of 12, and a crew
// that can only grow when one particular person is awake does not grow.

/** "Live" is not revoked and not yet expired. Liveness is a clock predicate,
 * which is exactly why it cannot be a partial unique index. */
const liveInvite = (crewId: string) =>
  and(
    eq(crewInvites.crewId, crewId),
    isNull(crewInvites.revokedAt),
    gt(crewInvites.expiresAt, sql`now()`),
  )

const toInvite = (row: {
  id: string
  crewId: string
  token: string
  createdBy: string | null
  expiresAt: Date
  createdAt: Date
}): CrewInvite => ({
  id: row.id,
  crewId: row.crewId,
  token: row.token,
  createdBy: row.createdBy,
  expiresAt: row.expiresAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
})

// Built per call rather than read at module load: the route unit tests mock
// `@concert-crawl/db` with an explicit export list, and touching a table's
// columns at import time makes this module unloadable under those mocks.
const inviteColumns = () => ({
  id: crewInvites.id,
  crewId: crewInvites.crewId,
  token: crewInvites.token,
  createdBy: crewInvites.createdBy,
  expiresAt: crewInvites.expiresAt,
  createdAt: crewInvites.createdAt,
})

// POST /v1/crews/:crewId/invites — mint. A crew has at most one live link, so
// "Retire this link" means something.
crewsRouter.post('/:crewId/invites', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)
  const crewId = parsed.data

  // Revoke and insert run inside ONE transaction that takes the crew row lock
  // first — the same lock the join path takes (plan D4). Revoke-then-insert
  // without it does not give "at most one live link": two members minting
  // concurrently both read zero live invites and both insert.
  const result = await db.transaction(async (tx) => {
    const locked = await lockCrew(tx, crewId)
    if (!locked) return { kind: 'denied' } as const
    if (!(await isMember(tx, crewId, userId)))
      return { kind: 'denied' } as const

    await tx
      .update(crewInvites)
      .set({ revokedAt: sql`now()`, revokedBy: userId })
      .where(liveInvite(crewId))

    // The TTL is measured from the database clock, like every other decision
    // about whether an invite is live (`liveInvite`, and the join path's
    // expiry check). Minting against the API instance's clock would let a
    // skewed instance hand out a link that the DB considers already dead.
    const [minted] = await tx
      .insert(crewInvites)
      .values({
        crewId,
        token: generateCrewInviteToken(),
        createdBy: userId,
        expiresAt: sql`now() + make_interval(secs => ${CREW_INVITE_TTL_MS / 1000})`,
      })
      .returning(inviteColumns())
    if (!minted) throw new Error('crew invite insert returned no rows')
    return { kind: 'minted', minted } as const
  })

  if (result.kind === 'denied')
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  return ctx.json(
    { success: true, data: { invite: toInvite(result.minted) } },
    201,
  )
})

// GET /v1/crews/:crewId/invites/current — the live invite, or null.
crewsRouter.get('/:crewId/invites/current', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const crew = await resolveMembership(parsed.data, authInfo.userId)
  if (!crew)
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)

  // At most one row should qualify, but the ORDER BY is not decoration: if a
  // race ever produced two, the sheet must show the same one on every read.
  // createdAt alone ties when two rows land in the same tick, so id breaks it.
  const [row] = await db
    .select(inviteColumns())
    .from(crewInvites)
    .where(liveInvite(parsed.data))
    .orderBy(desc(crewInvites.createdAt), desc(crewInvites.id))
    .limit(1)

  return ctx.json({
    success: true,
    data: { invite: row ? toInvite(row) : null },
  })
})

// POST /v1/crews/:crewId/invites/:inviteId/revoke — retire the link.
crewsRouter.post('/:crewId/invites/:inviteId/revoke', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const parsed = uuidSchema.safeParse(ctx.req.param('crewId'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid crew ID' }, 400)

  const inviteParsed = uuidSchema.safeParse(ctx.req.param('inviteId'))
  if (!inviteParsed.success)
    return ctx.json({ success: false, error: 'Invalid invite ID' }, 400)

  // Takes the same crew row lock as minting and joining (plan D4). Without it
  // a revoke lands between a join's re-validation and its insert, and the
  // membership row is written against a link that is already dead — which is
  // the exact race the join path takes the lock to avoid.
  const result = await db.transaction(async (tx) => {
    const locked = await lockCrew(tx, parsed.data)
    if (!locked) return { kind: 'denied' } as const
    if (!(await isMember(tx, parsed.data, authInfo.userId)))
      return { kind: 'denied' } as const

    // The crew predicate rides in the UPDATE's own WHERE rather than being
    // checked first, so an invite belonging to another crew cannot be retired
    // by a member of this one. `revokedAt IS NULL` keeps a double tap from
    // moving the timestamp.
    const [revoked] = await tx
      .update(crewInvites)
      .set({ revokedAt: sql`now()`, revokedBy: authInfo.userId })
      .where(
        and(
          eq(crewInvites.id, inviteParsed.data),
          eq(crewInvites.crewId, parsed.data),
          isNull(crewInvites.revokedAt),
        ),
      )
      .returning({ id: crewInvites.id })
    if (revoked) return { kind: 'revoked' } as const

    // Zero rows updated means either "already revoked" or "no such invite", and
    // those are different answers. Revoking is idempotent — the second tap asks
    // for a state that already holds, which is a success — so only a genuinely
    // absent invite is a 404.
    const [existing] = await tx
      .select({ id: crewInvites.id })
      .from(crewInvites)
      .where(
        and(
          eq(crewInvites.id, inviteParsed.data),
          eq(crewInvites.crewId, parsed.data),
        ),
      )
      .limit(1)

    return existing
      ? ({ kind: 'revoked' } as const)
      : ({ kind: 'gone' } as const)
  })

  if (result.kind === 'denied')
    return ctx.json({ success: false, error: 'Not a member of this crew' }, 403)
  if (result.kind === 'gone')
    return ctx.json({ success: false, error: 'Invite not found' }, 404)

  return ctx.json({ success: true, data: { revoked: true } })
})
