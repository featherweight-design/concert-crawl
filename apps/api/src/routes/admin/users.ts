import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createClerkClient } from '@clerk/backend'
import { desc, eq, sql } from 'drizzle-orm'
import {
  db,
  events,
  feedback,
  priceSubmissions,
  userArtistFollows,
  userEvents,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import type { AdminVariables } from './index.js'
import type {
  AdminUserDetail,
  AdminUserFeedbackItem,
  AdminUserTrackedEventItem,
  Role,
} from '@concert-crawl/types'
import { ROLE_HIERARCHY, isRole } from '@concert-crawl/types'

const userIdParamSchema = z.object({ userId: z.string().min(1).max(255) })

// A Clerk "user not found" surfaces as an error carrying HTTP 404. Only that
// case means a genuinely deleted/missing account; any other failure (timeout,
// 5xx) must propagate rather than masquerade as clerkAccountMissing.
const isClerkNotFound = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null || !('status' in err)) {
    return false
  }
  const { status } = err
  return status === 404
}

const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
const clerkClient = createClerkClient({ secretKey })

const ASSIGNABLE_ROLES: readonly Role[] = ['admin', 'promoter', 'beta', 'user']

const patchRoleSchema = z.object({
  role: z.enum(['admin', 'promoter', 'beta', 'user']),
})

export const usersAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/users — list all Clerk users with their current role
usersAdminRouter.get('/', async (ctx) => {
  const limitParam = ctx.req.query('limit')
  const offsetParam = ctx.req.query('offset')
  const query = ctx.req.query('query') ?? ''

  const limit = Math.min(Number(limitParam) || 50, 100)
  const offset = Number(offsetParam) || 0

  const listParams = {
    limit,
    offset,
    orderBy: '-created_at' as const,
    ...(query ? { query } : {}),
  }
  const result = await clerkClient.users.getUserList(listParams)

  const data = result.data.map((user) => {
    const rawRole = (user.publicMetadata as { role?: unknown }).role
    const role: Role = isRole(rawRole) ? rawRole : 'user'
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      handle:
        (user.publicMetadata as { handle?: unknown }).handle ??
        user.username ??
        null,
      role,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    }
  })

  return ctx.json({ success: true, data: { data, total: result.totalCount } })
})

// GET /v1/admin/users/:userId — full detail for one user: identity (Clerk +
// profile), feedback history, and watchlist. Backs the "View @user" jump from
// the feedback inbox. Registered before /:id/role — distinct method+shape so
// no param-capture conflict.
usersAdminRouter.get(
  '/:userId',
  zValidator('param', userIdParamSchema),
  async (ctx) => {
    const { userId } = ctx.req.valid('param')

    // Clerk is the identity source of truth; a deleted account can still be
    // referenced by old feedback rows, so tolerate a missing Clerk record.
    let clerkUser: Awaited<
      ReturnType<typeof clerkClient.users.getUser>
    > | null = null
    try {
      clerkUser = await clerkClient.users.getUser(userId)
    } catch (err) {
      // Rethrow anything but a confirmed 404 so transient Clerk failures
      // surface as a 5xx (via app.onError) instead of a false "deleted account".
      if (!isClerkNotFound(err)) throw err
      clerkUser = null
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    // Cheap existence signals first: counts, profile, and Clerk decide the
    // 404 before we pay for the two 100-row list+join queries below. The four
    // counts are independent, so run them concurrently to shave latency.
    const [
      [feedbackCountRow],
      [watchingCountRow],
      [priceCountRow],
      [artistCountRow],
    ] = await Promise.all([
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(feedback)
        .where(eq(feedback.userId, userId)),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(userEvents)
        .where(eq(userEvents.userId, userId)),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(priceSubmissions)
        .where(eq(priceSubmissions.userId, userId)),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(userArtistFollows)
        .where(eq(userArtistFollows.userId, userId)),
    ])

    const feedbackTotal = feedbackCountRow?.value ?? 0
    const watchingTotal = watchingCountRow?.value ?? 0
    const priceTotal = priceCountRow?.value ?? 0
    const artistTotal = artistCountRow?.value ?? 0

    // 404 only when the id maps to nothing at all — no Clerk record, no
    // profile, and no activity of any kind — so a bad URL renders notFound()
    // rather than an empty shell.
    if (
      !clerkUser &&
      !profile &&
      feedbackTotal === 0 &&
      watchingTotal === 0 &&
      priceTotal === 0 &&
      artistTotal === 0
    ) {
      return ctx.json({ success: false, error: 'User not found' }, 404)
    }

    // Totals above stay accurate past this display limit; the lists only run
    // once we know the response is a 200. The two are independent, so run them
    // concurrently to match the count-query fan-out above.
    const [feedbackRows, watchingRows] = await Promise.all([
      db
        .select({
          id: feedback.id,
          category: feedback.category,
          status: feedback.status,
          message: feedback.message,
          pageUrl: feedback.pageUrl,
          issueUrl: feedback.issueUrl,
          createdAt: feedback.createdAt,
        })
        .from(feedback)
        .where(eq(feedback.userId, userId))
        .orderBy(desc(feedback.createdAt))
        .limit(100),
      db
        .select({
          eventId: events.id,
          eventTitle: events.title,
          eventDate: events.date,
          venueName: venues.name,
          status: userEvents.status,
          createdAt: userEvents.createdAt,
        })
        .from(userEvents)
        .innerJoin(events, eq(userEvents.eventId, events.id))
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(userEvents.userId, userId))
        .orderBy(desc(userEvents.createdAt))
        .limit(100),
    ])

    const publicMeta = clerkUser?.publicMetadata as
      { role?: unknown; handle?: unknown } | undefined
    const rawRole = publicMeta?.role
    // A live Clerk account with no explicit role is a plain 'user' (matching
    // the list endpoint); null is reserved for deleted/missing Clerk records.
    const role: Role | null = isRole(rawRole)
      ? rawRole
      : clerkUser
        ? 'user'
        : null
    const rawHandle = publicMeta?.handle
    const clerkHandle = typeof rawHandle === 'string' ? rawHandle : null

    const feedbackHistory: AdminUserFeedbackItem[] = feedbackRows.map(
      (row) => ({
        id: row.id,
        category: row.category,
        status: row.status,
        message: row.message,
        pageUrl: row.pageUrl,
        issueUrl: row.issueUrl,
        createdAt: row.createdAt.toISOString(),
      }),
    )

    const trackedEvents: AdminUserTrackedEventItem[] = watchingRows.map(
      (row) => ({
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        eventDate: row.eventDate,
        venueName: row.venueName,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }),
    )

    // A Clerk account can hold several addresses; surface the primary one
    // rather than whichever happens to sit at index 0.
    const primaryEmail =
      clerkUser?.emailAddresses.find(
        (address) => address.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      null

    const data: AdminUserDetail = {
      id: userId,
      email: primaryEmail,
      handle: profile?.handle ?? clerkHandle ?? clerkUser?.username ?? null,
      city: profile?.city ?? null,
      theme: profile?.theme ?? null,
      avatarColor: profile?.avatarColor ?? null,
      role,
      joinedAt: clerkUser?.createdAt
        ? new Date(clerkUser.createdAt).toISOString()
        : null,
      clerkAccountMissing: !clerkUser,
      stats: {
        feedback: feedbackTotal,
        trackedEvents: watchingTotal,
        priceSubmissions: priceTotal,
        artistFollows: artistTotal,
      },
      feedback: feedbackHistory,
      trackedEvents,
    }

    return ctx.json({ success: true, data })
  },
)

// PATCH /v1/admin/users/:id/role — assign a role to a Clerk user
usersAdminRouter.patch(
  '/:id/role',
  zValidator('json', patchRoleSchema),
  async (ctx) => {
    const auth = getAuth(ctx)
    const targetUserId = ctx.req.param('id')
    const { role } = ctx.req.valid('json')

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return ctx.json({ success: false, error: 'Invalid role' }, 400)
    }

    // Prevent self-demotion from admin (safety guard)
    if (auth?.userId === targetUserId) {
      const self = await clerkClient.users.getUser(targetUserId)
      const currentRole = (self.publicMetadata as { role?: unknown }).role
      if (
        currentRole === 'admin' &&
        ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('admin')
      ) {
        return ctx.json(
          { success: false, error: 'Cannot demote your own admin account' },
          403,
        )
      }
    }

    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role },
    })

    ctx.set('auditAction', 'user.role.update')
    ctx.set('auditTargetId', targetUserId)
    ctx.set('auditActorId', auth?.userId ?? 'unknown')
    ctx.set('auditMeta', { role })

    return ctx.json({ success: true })
  },
)
