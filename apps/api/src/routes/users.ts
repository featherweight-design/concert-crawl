// apps/api/src/routes/users.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq, count, ne, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  db,
  founderWindow,
  userProfiles,
  userCred,
  priceSubmissions,
  events,
  venues,
} from '@concert-crawl/db'
import { createClerkClient } from '@clerk/backend'
import type {
  DisplayRole,
  FounderWindowView,
  RoleBadge,
  SubmissionDisplayStatus,
  UserProfileResponse,
  UserSubmissionItem,
  HandleAvailabilityResponse,
  Tier,
} from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { deleteUserData } from '../lib/user-data.js'
import { isClerkNotFound } from '../lib/clerk-errors.js'
import { evaluateNudgeFlags } from '../lib/nudges.js'
import { loadPlanContext } from '../lib/plan.js'
import { resolveFounderWindowView } from './billing-founder-window.js'

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

function mapStatus(dbStatus: string): SubmissionDisplayStatus {
  if (dbStatus === 'corroborated') return 'confirmed'
  if (dbStatus === 'disputed') return 'disputed'
  return 'pending'
}

function formatJoined(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Optional narrowing input for the past-due banner predicate — invalid or
// missing values fall back to null rather than 400.
const sessionStartedAtSchema = z.string().datetime({ offset: true })

// The profile surface must not 500 over a billing read — a missing
// founder_window singleton falls back to the pre-launch view.
const FOUNDER_WINDOW_FALLBACK: FounderWindowView = {
  state: 'pre-launch',
  seatsTotal: 100,
  closesAt: null,
}

async function loadFounderWindowView(now: Date): Promise<FounderWindowView> {
  try {
    const [windowRow] = await db
      .select()
      .from(founderWindow)
      .where(eq(founderWindow.id, 1))
      .limit(1)
    if (!windowRow) {
      apiLogger.error({}, 'users/me: founder_window singleton row missing')
      return FOUNDER_WINDOW_FALLBACK
    }
    return resolveFounderWindowView(windowRow, now)
  } catch (err) {
    apiLogger.error({ err }, 'users/me: founder_window read failed')
    return FOUNDER_WINDOW_FALLBACK
  }
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

  const planContext = await loadPlanContext(
    auth.userId,
    clerkUser.publicMetadata,
  )
  const { planState } = planContext

  const parsedSessionStartedAt = sessionStartedAtSchema.safeParse(
    ctx.req.query('sessionStartedAt'),
  )
  const sessionStartedAt = parsedSessionStartedAt.success
    ? new Date(parsedSessionStartedAt.data)
    : null

  const now = new Date()
  const nudgeFlags = evaluateNudgeFlags({
    trialEndsAt: planContext.trialEndsAt,
    lastTrialEndedShownAt: planContext.nudgeTimestamps.lastTrialEndedShownAt,
    dayThirteenBannerDismissedAt:
      planContext.nudgeTimestamps.dayThirteenBannerDismissedAt,
    pastDueBannerDismissedAt:
      planContext.nudgeTimestamps.pastDueBannerDismissedAt,
    subscriptionStatus: planState.status,
    sessionStartedAt,
    now,
  })

  const founderWindowView = await loadFounderWindowView(now)

  const [submissionCountRow] = await db
    .select({ value: count() })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.userId, auth.userId))

  const [credRow] = await db
    .select({ priceCredScore: userCred.priceCredScore })
    .from(userCred)
    .where(eq(userCred.userId, auth.userId))
    .limit(1)

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const rawRole = (clerkUser.publicMetadata as { role?: unknown }).role
  const authRole = typeof rawRole === 'string' ? rawRole : undefined

  const displayRole: DisplayRole =
    authRole === 'admin' || authRole === 'sub_admin' ? 'staff' : 'fan'

  const roleBadge: RoleBadge | null =
    authRole === 'admin' || authRole === 'sub_admin'
      ? 'admin'
      : authRole === 'promoter'
        ? 'promoter'
        : authRole === 'beta'
          ? 'beta'
          : null

  const response: UserProfileResponse = {
    id: auth.userId,
    email,
    handle: profile?.handle ?? null,
    city: profile?.city ?? null,
    avatarColor: profile?.avatarColor ?? null,
    theme: profile?.theme ?? 'electric',
    planState,
    displayRole,
    roleBadge,
    joined: formatJoined(
      clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
    ),
    submissionCount: submissionCountRow?.value ?? 0,
    cred: credRow?.priceCredScore ?? 0,
    showTrialEndedTakeover: nudgeFlags.showTrialEndedTakeover,
    showDayThirteenBanner: nudgeFlags.showDayThirteenBanner,
    showPastDueBanner: nudgeFlags.showPastDueBanner,
    founderWindow: founderWindowView,
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

  // Application data first, in one transaction, across every table the
  // user-data registry classifies. If this throws, the Clerk account still
  // exists and the user can retry: the previous version deleted the Clerk user
  // even when the cleanup had only partly run, which stranded rows behind an
  // identity nobody could sign in as.
  await deleteUserData(auth.userId)

  try {
    await clerkClient.users.deleteUser(auth.userId)
  } catch (err) {
    // A 404 means the identity is already gone, which is the outcome we were
    // asking for. Anything else leaves a sign-in the user still has.
    if (isClerkNotFound(err)) {
      apiLogger.warn(
        { userId: auth.userId },
        'Clerk user was already gone at account deletion',
      )
    } else {
      apiLogger.error(
        { err, userId: auth.userId },
        'Clerk user delete failed after application data was removed',
      )
      // Saying the account is deleted while they can still sign in is a lie
      // they cannot check. Retrying is safe: `deleteUserData` matches on the
      // user id, so a second run finds nothing left to remove.
      return ctx.json(
        { success: false, error: 'Account deletion did not complete' },
        500,
      )
    }
  }

  return ctx.json({ success: true })
})
