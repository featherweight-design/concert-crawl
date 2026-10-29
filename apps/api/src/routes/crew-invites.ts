// apps/api/src/routes/crew-invites.ts
//
// Concert Crews (#1226) — the join surface. Separate from the /v1/crews router
// because it is keyed by a token rather than a crew id: the caller of these
// routes is by definition not yet a member, so the membership boundary that
// guards every route in crews.ts cannot guard these.
//
// Both routes are AUTHENTICATED. The join page is auth-gated for beta, so
// there is no signed-out consumer and shipping these open would add a public
// surface nothing calls. The shape is ready for a launch-time flip to public,
// but the flip is not shipped on a guess — see the rate-limit note below for
// the one thing that has to change with it.

import { Hono } from 'hono'
import type { Context } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { and, eq, sql, type SQL } from 'drizzle-orm'
import {
  crewInvites,
  crewMembers,
  crews,
  db,
  userProfiles,
} from '@concert-crawl/db'
import type { PublicCrewInvite } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { checkRateLimit } from '../lib/rate-limit.js'
import {
  CREW_FULL_CODE,
  CREW_MEMBER_CAP,
  countMembers,
  isMember,
  lockCrew,
} from '../lib/crews.js'
import { crewInviteTokenSchema } from '../lib/crew-invite-token.js'
import { notifyCrewMembershipChange } from '../lib/crew-notifications.js'
import { requireFlag } from '../middleware/feature-flag.js'

/**
 * 72 bits is only strong if enumeration is also expensive. Keyed on the Clerk
 * id now that the route is authenticated — a better key than an IP, and it
 * sidesteps the `x-forwarded-for` derivation entirely.
 *
 * The budget is held in Postgres (#528), so it is one budget across every API
 * instance and survives restarts. If this endpoint is ever flipped public, the
 * key has to fall back
 * to the IP derivation in routes/waitlist.ts
 * (`.split(',')[0]?.trim() ?? 'unknown'`) — do not invent a second convention
 * at that point.
 */
const TOKEN_LIMIT = 30
const TOKEN_WINDOW_MS = 10 * 60 * 1000

/**
 * One budget across BOTH routes, deliberately. Join answers 404/409/200
 * distinctly, so it enumerates just as well as resolve does; a per-route
 * budget would let an attacker spend one and then the other for twice the
 * attempts. Returns the 429 response, or null when the caller may proceed.
 */
const spendTokenBudget = async (
  ctx: Context,
  userId: string,
  event: string,
) => {
  const limit = await checkRateLimit(
    `crew-invite:${userId}`,
    TOKEN_LIMIT,
    TOKEN_WINDOW_MS,
    // Fail closed: this budget is the enumeration guard on invite tokens, and
    // both routes read the same database next, so closing costs no availability
    // a real outage had not already taken.
    { onStoreError: 'deny', userId },
  )
  if (limit.allowed) return null
  // Every other 429 in this API carries Retry-After (feedback.ts, spotify.ts),
  // and a client that cannot see the window backs off by guessing.
  ctx.header('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)))
  apiLogger.info({ userId }, event)
  return ctx.json({ success: false, error: 'Too many requests' }, 429)
}

type DeadReason = 'expired' | 'revoked' | 'unknown'

export const crewInvitesRouter = new Hono()

// Release gate, mounted ahead of auth so a flagged-off invite link is
// indistinguishable from an unrouted path.
crewInvitesRouter.use('*', requireFlag('crews'))

crewInvitesRouter.use('*', clerkMiddleware())

/**
 * Expiry is decided by the database clock, never the API instance's, matching
 * `liveInvite()` in routes/crews.ts. Two instances with a few seconds of skew
 * would otherwise disagree about who may join in the seconds either side of
 * the TTL boundary, and the minting side already answers to `now()`.
 *
 * Built on call rather than held as a module constant, for the same reason
 * `liveInvite()` is: evaluating `sql` at import time obliges every suite that
 * partially mocks `drizzle-orm` to supply that export, and routes/index.ts
 * puts this router in the import graph of all of them.
 */
const isExpired = (): SQL<boolean> =>
  sql<boolean>`${crewInvites.expiresAt} <= now()`

interface LoadedInvite {
  inviteId: string
  crewId: string
  createdBy: string | null
  expired: boolean
  revokedAt: Date | null
  name: string
  patchSalt: number
}

const loadInvite = async (token: string): Promise<LoadedInvite | null> => {
  const [row] = await db
    .select({
      inviteId: crewInvites.id,
      crewId: crewInvites.crewId,
      createdBy: crewInvites.createdBy,
      expired: isExpired(),
      revokedAt: crewInvites.revokedAt,
      name: crews.name,
      patchSalt: crews.patchSalt,
    })
    .from(crewInvites)
    .innerJoin(crews, eq(crews.id, crewInvites.crewId))
    .where(eq(crewInvites.token, token))
    .limit(1)
  return row ?? null
}

/** Dead means dead: expired, revoked, and unknown are indistinguishable to the
 * caller apart from the reason, and none of them carries crew identity. An
 * absent invite is answered by the caller, which narrows on it anyway — taking
 * a nullable here would leave the caller with a second, unreachable check. */
const deadReason = (invite: LoadedInvite): DeadReason | null => {
  if (invite.revokedAt) return 'revoked'
  if (invite.expired) return 'expired'
  return null
}

// GET /v1/crew-invites/:token — resolution for the landing page.
crewInvitesRouter.get('/:token', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const limited = await spendTokenBudget(
    ctx,
    userId,
    'crew invite resolution rate limited',
  )
  if (limited) return limited

  // A malformed token can only ever be unknown, so it never reaches the DB.
  // The token itself is the capability and is deliberately absent from the
  // log line (plan D3).
  const parsed = crewInviteTokenSchema.safeParse(ctx.req.param('token'))
  if (!parsed.success) {
    apiLogger.info({ userId }, 'crew invite rejected on token shape')
    return ctx.json({ success: false, reason: 'unknown' }, 404)
  }

  const invite = await loadInvite(parsed.data)
  if (!invite) {
    apiLogger.info(
      { userId, reason: 'unknown' },
      'crew invite resolved as dead',
    )
    return ctx.json({ success: false, reason: 'unknown' }, 404)
  }

  const dead = deadReason(invite)
  if (dead) {
    // A dead link renders no crew identity at all (locked decision 11), so
    // `reason` is the whole payload — no name, no patch, no member count.
    apiLogger.info({ userId, reason: dead }, 'crew invite resolved as dead')
    return ctx.json({ success: false, reason: dead }, 404)
  }

  // createdBy is null once the inviter deletes their account. The link stays
  // live — it belongs to the crew, not to them — so the invite renders with no
  // attribution rather than reading as dead.
  const inviterHandle = async (): Promise<string | null> => {
    if (invite.createdBy === null) return null
    const [row] = await db
      .select({ handle: userProfiles.handle })
      .from(userProfiles)
      .where(eq(userProfiles.userId, invite.createdBy))
      .limit(1)
    return row?.handle ?? null
  }

  const [memberCount, invitedByHandle, viewerIsMember] = await Promise.all([
    countMembers(db, invite.crewId),
    inviterHandle(),
    isMember(db, invite.crewId, userId),
  ])

  // At capacity is NOT a dead link: crew identity stays visible and the CTA
  // swaps, which is what `isFull` exists for.
  const payload: PublicCrewInvite = {
    crewId: invite.crewId,
    name: invite.name,
    patchSalt: invite.patchSalt,
    memberCount,
    invitedByHandle,
    isFull: memberCount >= CREW_MEMBER_CAP,
    viewerIsMember,
  }

  return ctx.json({ success: true, data: { invite: payload } })
})

// POST /v1/crew-invites/:token/join — authenticated, NOT entitlement-gated.
// Paying is the price of starting a crew, never of being in one (plan D6).
crewInvitesRouter.post('/:token/join', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = authInfo.userId

  const limited = await spendTokenBudget(ctx, userId, 'crew join rate limited')
  if (limited) return limited

  const parsed = crewInviteTokenSchema.safeParse(ctx.req.param('token'))
  if (!parsed.success) {
    apiLogger.info({ userId }, 'crew join rejected on token shape')
    return ctx.json({ success: false, reason: 'unknown' }, 404)
  }
  const token = parsed.data

  // Everything after the crew id is resolved runs under the crew row lock. The
  // token is re-validated inside it, so a link revoked between the landing
  // page's resolution and this tap does not admit anyone, and twelve people
  // tapping a forwarded link at once cannot all read `memberCount = 11` and
  // all insert (plan D4).
  const result = await db.transaction(async (tx) => {
    const [found] = await tx
      .select({ crewId: crewInvites.crewId })
      .from(crewInvites)
      .where(eq(crewInvites.token, token))
      .limit(1)
    if (!found) return { kind: 'dead', reason: 'unknown' } as const

    const locked = await lockCrew(tx, found.crewId)
    // The crew went away between the two statements. Same answer as an unknown
    // token: there is nothing to join and nothing to reveal.
    if (!locked) return { kind: 'dead', reason: 'unknown' } as const

    const [live] = await tx
      .select({
        expired: isExpired(),
        revokedAt: crewInvites.revokedAt,
      })
      .from(crewInvites)
      .where(
        and(eq(crewInvites.token, token), eq(crewInvites.crewId, found.crewId)),
      )
      .limit(1)
    if (!live) return { kind: 'dead', reason: 'unknown' } as const
    if (live.revokedAt) return { kind: 'dead', reason: 'revoked' } as const
    if (live.expired) return { kind: 'dead', reason: 'expired' } as const

    // A forwarded link tapped twice is not a failure.
    if (await isMember(tx, found.crewId, userId))
      return { kind: 'already', crewId: found.crewId } as const

    if ((await countMembers(tx, found.crewId)) >= CREW_MEMBER_CAP)
      return { kind: 'full', crewId: found.crewId } as const

    await tx.insert(crewMembers).values({ crewId: found.crewId, userId })
    return { kind: 'joined', crewId: found.crewId } as const
  })

  if (result.kind === 'dead') {
    apiLogger.info({ userId, reason: result.reason }, 'crew join on dead link')
    return ctx.json({ success: false, reason: result.reason }, 404)
  }
  if (result.kind === 'full') {
    apiLogger.info({ userId, crewId: result.crewId }, 'crew join hit the cap')
    return ctx.json(
      {
        success: false,
        error: 'This crew is full',
        code: CREW_FULL_CODE,
      },
      409,
    )
  }

  // Fan-out only on the branch that actually created the row, and only after
  // the transaction above committed (#1226 PR-7). A forwarded link tapped
  // twice returns `already` and must not re-announce the same person.
  if (result.kind === 'joined') {
    await notifyCrewMembershipChange({
      actorUserId: userId,
      crewId: result.crewId,
      action: 'joined',
    })
  }

  // `joined` reports whether THIS call created the membership row, so a client
  // can tell "welcome in" from "you were already here" without reading two
  // fields against each other. Membership is guaranteed in both branches — the
  // pair to check for "am I in the crew now" is `joined || alreadyMember`.
  return ctx.json({
    success: true,
    data: {
      crewId: result.crewId,
      joined: result.kind === 'joined',
      alreadyMember: result.kind === 'already',
    },
  })
})
