// apps/api/src/routes/users.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq, count, ne, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  db,
  userProfiles,
  userRoles,
  priceSubmissions,
  subscriptions,
  events,
  venues,
} from '@concert-crawl/db'
import { createClerkClient } from '@clerk/backend'
import type {
  UserPlan,
  DisplayRole,
  SubmissionDisplayStatus,
  UserProfileResponse,
  UserSubmissionItem,
  HandleAvailabilityResponse,
  Tier,
} from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'

export const usersRouter = new Hono()

usersRouter.use('*', clerkMiddleware())

const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
const clerkClient = createClerkClient({ secretKey })

const RESERVED_HANDLES = new Set([
  'admin',
  'support',
  'help',
  'settings',
  'me',
  'api',
  'auth',
  'staff',
  'crew',
  'artist',
  'fan',
  'null',
  'anonymous',
  'everyone',
  'all',
  'new',
  'create',
  'edit',
  'delete',
  'error',
  'login',
  'logout',
  'signup',
  'signin',
  'index',
  'home',
  'about',
  'contact',
  'concertcrawl',
  'denver',
  'mod',
  'moderator',
  'system',
  'bot',
])

const HANDLE_REGEX = /^[a-z0-9_]+$/

function derivePlan(
  sub: { founder: boolean; tier: string; status: string } | undefined,
): UserPlan {
  if (!sub) return 'founder'
  if (sub.founder) return 'founder'
  if (sub.tier === 'premium' && sub.status === 'active') return 'paid'
  if (sub.tier === 'premium' && sub.status === 'past_due') return 'past-due'
  if (sub.tier === 'free' && sub.status === 'active') return 'trial'
  return 'founder'
}

function mapStatus(dbStatus: string): SubmissionDisplayStatus {
  if (dbStatus === 'corroborated') return 'confirmed'
  if (dbStatus === 'disputed') return 'disputed'
  return 'pending'
}

function formatJoined(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// GET /v1/users/me
usersRouter.get('/me', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const clerkUser = await clerkClient.users.getUser(auth.userId)

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))
    .limit(1)

  const [sub] = await db
    .select({
      founder: subscriptions.founder,
      tier: subscriptions.tier,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, auth.userId))
    .limit(1)

  const [submissionCountRow] = await db
    .select({ value: count() })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.userId, auth.userId))

  const [credRow] = await db
    .select({ priceCredScore: userRoles.priceCredScore })
    .from(userRoles)
    .where(eq(userRoles.userId, auth.userId))
    .limit(1)

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const rawRole = (clerkUser.publicMetadata as { role?: unknown }).role
  const authRole = typeof rawRole === 'string' ? rawRole : undefined

  const displayRole: DisplayRole =
    authRole === 'admin' || authRole === 'sub_admin' ? 'staff' : 'fan'

  const response: UserProfileResponse = {
    id: auth.userId,
    email,
    handle: profile?.handle ?? null,
    city: profile?.city ?? null,
    avatarColor: profile?.avatarColor ?? null,
    theme: profile?.theme ?? 'electric',
    plan: derivePlan(sub),
    displayRole,
    joined: formatJoined(
      clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
    ),
    submissionCount: submissionCountRow?.value ?? 0,
    cred: credRow?.priceCredScore ?? 0,
  }

  return ctx.json({ success: true, data: response })
})

// PATCH /v1/users/me
const patchSchema = z.object({
  handle: z.string().min(3).max(20).regex(HANDLE_REGEX).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  avatarColor: z
    .enum(['signal', 'accent', 'success', 'warning'])
    .nullable()
    .optional(),
  theme: z
    .enum([
      'electric',
      'jade',
      'light',
      'pulse',
      'forge',
      'bluenote',
      'drip',
      'cedar',
      'gloss',
    ])
    .optional(),
})

usersRouter.patch('/me', zValidator('json', patchSchema), async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const body = ctx.req.valid('json')

  if (body.handle !== undefined && body.handle !== null) {
    if (RESERVED_HANDLES.has(body.handle)) {
      return ctx.json(
        { success: false, error: 'Handle is reserved', code: 'reserved' },
        422,
      )
    }
    const [existingHandle] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.handle, body.handle),
          ne(userProfiles.userId, auth.userId),
        ),
      )
      .limit(1)
    if (existingHandle) {
      return ctx.json(
        { success: false, error: 'Handle is taken', code: 'taken' },
        409,
      )
    }
  }

  const updateValues: Partial<typeof userProfiles.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (body.handle !== undefined) updateValues.handle = body.handle
  if (body.city !== undefined) updateValues.city = body.city
  if (body.avatarColor !== undefined)
    updateValues.avatarColor = body.avatarColor
  if (body.theme !== undefined) updateValues.theme = body.theme

  const [existingProfile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))
    .limit(1)

  if (existingProfile) {
    await db
      .update(userProfiles)
      .set(updateValues)
      .where(eq(userProfiles.userId, auth.userId))
  } else {
    await db.insert(userProfiles).values({
      userId: auth.userId,
      handle: body.handle ?? null,
      city: body.city ?? null,
      avatarColor: body.avatarColor ?? null,
      theme: body.theme ?? 'electric',
    })
  }

  return ctx.json({ success: true })
})

// GET /v1/users/me/submissions/count — count of non-stale price submissions for current user
usersRouter.get('/me/submissions/count', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const [row] = await db
    .select({ value: count() })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.userId, auth.userId),
        ne(priceSubmissions.status, 'stale'),
      ),
    )

  return ctx.json({ success: true, data: { count: row?.value ?? 0 } })
})

// GET /v1/users/me/submissions
usersRouter.get('/me/submissions', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  type SubmissionRow = {
    id: string
    eventId: string
    artist: string | null
    venue: string | null
    date: string | null
    priceMin: string
    priceMax: string | null
    tier: Tier
    corroborationCount: number
    submittedAt: Date
    status: string | null
  }

  const rows: SubmissionRow[] = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      artist: events.artist,
      venue: venues.name,
      date: events.date,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      tier: priceSubmissions.tier,
      corroborationCount: priceSubmissions.corroborationCount,
      submittedAt: priceSubmissions.createdAt,
      status: priceSubmissions.status,
    })
    .from(priceSubmissions)
    .leftJoin(events, eq(priceSubmissions.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(priceSubmissions.userId, auth.userId),
        ne(priceSubmissions.status, 'stale'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))

  const data: UserSubmissionItem[] = rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    artist: row.artist ?? 'Unknown',
    venue: row.venue ?? 'Unknown',
    date: row.date ?? '',
    priceMin: Math.round(parseFloat(row.priceMin) * 100),
    priceMax: row.priceMax ? Math.round(parseFloat(row.priceMax) * 100) : null,
    tier: row.tier,
    corroborationCount: row.corroborationCount,
    submittedAt: row.submittedAt.toISOString(),
    status: mapStatus(row.status ?? 'pending'),
  }))

  return ctx.json({ success: true, data })
})

// GET /v1/users/handle-availability
usersRouter.get('/handle-availability', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const handle = ctx.req.query('handle')
  if (!handle || handle.length < 3 || !HANDLE_REGEX.test(handle)) {
    return ctx.json({
      success: true,
      data: { available: false } satisfies HandleAvailabilityResponse,
    })
  }

  if (RESERVED_HANDLES.has(handle)) {
    return ctx.json({
      success: true,
      data: {
        available: false,
        reason: 'reserved',
      } satisfies HandleAvailabilityResponse,
    })
  }

  const [existing] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.handle, handle))
    .limit(1)

  return ctx.json({
    success: true,
    data: { available: !existing } satisfies HandleAvailabilityResponse,
  })
})

// DELETE /v1/users/me — delete account
usersRouter.delete('/me', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  // Anonymize this user's submissions — preserve corroboration counts
  await db
    .update(priceSubmissions)
    .set({ userId: null })
    .where(eq(priceSubmissions.userId, auth.userId))

  // Delete profile record
  await db.delete(userProfiles).where(eq(userProfiles.userId, auth.userId))

  // Delete from Clerk (throws if already deleted)
  try {
    await clerkClient.users.deleteUser(auth.userId)
  } catch (err) {
    apiLogger.warn(
      { err, userId: auth.userId },
      'Clerk user delete failed — already deleted or not found',
    )
  }

  return ctx.json({ success: true })
})
