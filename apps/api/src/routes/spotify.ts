// apps/api/src/routes/spotify.ts
//
// Spotify connection CRUD + on-demand sync (#763 PR 3, eng spec §6).
// All routes are auth-only and FREE — connecting, syncing, auto-watch, and
// highlighting carry no entitlement gate. Premium enforcement lives on the
// R2 read surfaces (taste filter, discovery, digest, push).
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { createClerkClient } from '@clerk/backend'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  spotifyAlertLog,
  userEvents,
  userProfiles,
  userSpotifyConnections,
} from '@concert-crawl/db'
import type { UserSpotifyConnection } from '@concert-crawl/db'
import type {
  SpotifyConnectionResponse,
  SpotifyConnectionView,
  SpotifyNudgeResponse,
} from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { checkRateLimit } from '../lib/rate-limit.js'
import { createSpotifyClient, SpotifyAuthError } from '../lib/spotify.js'
import {
  getMatchedUpcomingEventIds,
  getSpotifyMatchSummary,
} from '../lib/spotify-matches.js'
import {
  getSpotifyAccessToken,
  purgeSpotifyFollows,
  syncSpotifyConnection,
} from '../lib/spotify-sync.js'

// On-demand refresh window (spec §6): reject when the last sync is fresher
// than 10 minutes, with Retry-After pointing at the window's end.
const SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000

const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
const clerkClient = createClerkClient({ secretKey })

const patchSchema = z
  .object({
    autoWatch: z.boolean().optional(),
    digestEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.autoWatch !== undefined ||
      body.digestEnabled !== undefined ||
      body.pushEnabled !== undefined,
    { message: 'At least one toggle is required' },
  )

export const spotifyRouter = new Hono()

spotifyRouter.use('*', clerkMiddleware())

// The Denver-match summary rides along on every connection payload (PR 5) —
// it drives "N play Denver" on the success screen and Connections card.
const toView = async (
  row: UserSpotifyConnection,
): Promise<SpotifyConnectionView> => {
  const matches = await getSpotifyMatchSummary(row.userId)
  return {
    status: row.status,
    displayName: row.displayName ?? null,
    artistCount: row.artistCount,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    autoWatch: row.autoWatch,
    digestEnabled: row.digestEnabled,
    pushEnabled: row.pushEnabled,
    ...matches,
  }
}

const loadConnection = async (
  userId: string,
): Promise<UserSpotifyConnection | null> => {
  const [row] = await db
    .select()
    .from(userSpotifyConnections)
    .where(eq(userSpotifyConnections.userId, userId))
    .limit(1)
  return row ?? null
}

// Auto-watch opt-in backfill: claim a spotify_alert_log row per matched
// event (kind='auto_watch', the spec §10 idempotency ledger) and insert a
// Watching row for each newly-claimed claim. Both writes are
// onConflictDoNothing, so repeat opt-ins and races with the PR 10 fan-out
// never double-write. Never throws — the toggle write is the source of
// truth and already landed.
const backfillAutoWatch = async (userId: string): Promise<void> => {
  try {
    const eventIds = await getMatchedUpcomingEventIds(userId)
    if (eventIds.length === 0) return
    await db.transaction(async (tx) => {
      const claimed = await tx
        .insert(spotifyAlertLog)
        .values(
          eventIds.map((eventId) => ({
            userId,
            eventId,
            kind: 'auto_watch',
          })),
        )
        .onConflictDoNothing()
        .returning({ eventId: spotifyAlertLog.eventId })
      if (claimed.length === 0) return
      await tx
        .insert(userEvents)
        .values(
          claimed.map(({ eventId }) => ({
            userId,
            eventId,
            status: 'watching' as const,
          })),
        )
        .onConflictDoNothing()
    })
  } catch (err) {
    apiLogger.error({ err, userId }, 'spotify: auto-watch backfill failed')
  }
}

// Clerk models the linked account with provider 'oauth_spotify' (the
// strategy string); tolerate the unprefixed form too in case the SDK
// normalizes it in a future major.
const isSpotifyAccount = (account: { provider: string }): boolean =>
  account.provider === 'oauth_spotify' || account.provider === 'spotify'

// GET /v1/spotify/connection — drives Settings ▸ Connections + banners
spotifyRouter.get('/connection', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const row = await loadConnection(auth.userId)
  const data: SpotifyConnectionResponse = row
    ? await toView(row)
    : { status: 'disconnected' }
  return ctx.json({ success: true, data })
})

// POST /v1/spotify/connection — post-OAuth-return: verify the external
// account exists on the Clerk user, upsert our row, first sync inline so the
// success screen shows a real artist count (spec §3/§6).
spotifyRouter.post('/connection', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  let hasSpotifyAccount = false
  try {
    const clerkUser = await clerkClient.users.getUser(auth.userId)
    hasSpotifyAccount = clerkUser.externalAccounts.some(isSpotifyAccount)
  } catch (err) {
    apiLogger.error(
      { err, userId: auth.userId },
      'spotify connect: Clerk user lookup failed',
    )
    return ctx.json(
      { success: false, error: 'Failed to verify Spotify account' },
      500,
    )
  }
  if (!hasSpotifyAccount) {
    return ctx.json(
      { success: false, error: 'No Spotify account is linked to this user' },
      400,
    )
  }

  const tokenResult = await getSpotifyAccessToken(auth.userId)
  if (tokenResult.status === 'no-grant') {
    return ctx.json(
      { success: false, error: 'Spotify authorization is incomplete' },
      400,
    )
  }
  if (tokenResult.status === 'error') {
    return ctx.json(
      { success: false, error: 'Spotify is unavailable — try again shortly' },
      502,
    )
  }

  // Identity fetch (connect time only, spec §5): spotifyUserId + displayName
  let spotifyUserId: string
  let displayName: string | null
  try {
    const profile = await createSpotifyClient(tokenResult.token).getProfile()
    spotifyUserId = profile.spotifyUserId
    displayName = profile.displayName
  } catch (err) {
    apiLogger.error(
      { err, userId: auth.userId },
      'spotify connect: profile fetch failed',
    )
    if (err instanceof SpotifyAuthError) {
      return ctx.json(
        { success: false, error: 'Spotify authorization is incomplete' },
        400,
      )
    }
    return ctx.json(
      { success: false, error: 'Spotify is unavailable — try again shortly' },
      502,
    )
  }

  // Reconnect overwrites a revoked row back to 'connected' (spec §3);
  // toggle preferences survive the round trip.
  try {
    await db
      .insert(userSpotifyConnections)
      .values({ userId: auth.userId, spotifyUserId, displayName })
      .onConflictDoUpdate({
        target: userSpotifyConnections.userId,
        set: {
          spotifyUserId,
          displayName,
          status: 'connected',
          lastSyncError: null,
          connectedAt: new Date(),
        },
      })
  } catch (err) {
    apiLogger.error(
      { err, userId: auth.userId },
      'spotify connect: connection upsert failed',
    )
    return ctx.json({ success: false, error: 'Failed to connect Spotify' }, 500)
  }

  // First sync inline — outcomes land on the row (status/error bookkeeping),
  // so the response reflects whatever the sync left behind.
  await syncSpotifyConnection(auth.userId)

  const row = await loadConnection(auth.userId)
  if (!row) {
    return ctx.json({ success: false, error: 'Failed to connect Spotify' }, 500)
  }
  return ctx.json({ success: true, data: await toView(row) }, 201)
})

// POST /v1/spotify/connection/sync — on-demand "Refresh my taste"
spotifyRouter.post('/connection/sync', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const row = await loadConnection(auth.userId)
  if (!row)
    return ctx.json({ success: false, error: 'Spotify is not connected' }, 404)
  if (row.status === 'revoked') {
    return ctx.json(
      {
        success: false,
        error: 'Spotify access was revoked — reconnect to sync',
      },
      409,
    )
  }

  if (row.lastSyncedAt) {
    const elapsedMs = Date.now() - row.lastSyncedAt.getTime()
    if (elapsedMs < SYNC_MIN_INTERVAL_MS) {
      const retryAfterSec = Math.ceil((SYNC_MIN_INTERVAL_MS - elapsedMs) / 1000)
      ctx.header('Retry-After', String(retryAfterSec))
      return ctx.json(
        {
          success: false,
          error: 'Taste was refreshed recently — try again in a few minutes',
        },
        429,
      )
    }
  }

  // Failed syncs never advance lastSyncedAt, so the check above alone would
  // let refresh spam through during a Spotify outage. Each actual sync
  // attempt also consumes an in-memory token (feedback.ts pattern; resets on
  // deploy, which lastSyncedAt covers for the success path).
  const { allowed, retryAfterMs } = checkRateLimit(
    `spotify-sync:${auth.userId}`,
    1,
    SYNC_MIN_INTERVAL_MS,
  )
  if (!allowed) {
    ctx.header('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
    return ctx.json(
      {
        success: false,
        error: 'Taste was refreshed recently — try again in a few minutes',
      },
      429,
    )
  }

  await syncSpotifyConnection(auth.userId)

  const updated = await loadConnection(auth.userId)
  if (!updated) {
    return ctx.json({ success: false, error: 'Spotify is not connected' }, 404)
  }
  return ctx.json({ success: true, data: await toView(updated) })
})

// PATCH /v1/spotify/connection — Settings toggles + one-time auto-watch opt-in
spotifyRouter.patch('/connection', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  let body: unknown = null
  try {
    body = await ctx.req.json()
  } catch (err) {
    apiLogger.warn(
      { err, userId: auth.userId },
      'spotify: unparseable PATCH body',
    )
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return ctx.json(
      {
        success: false,
        error: 'Invalid input',
        details: parsed.error.flatten(),
      },
      422,
    )
  }

  const row = await loadConnection(auth.userId)
  if (!row)
    return ctx.json({ success: false, error: 'Spotify is not connected' }, 404)

  try {
    const [updated] = await db
      .update(userSpotifyConnections)
      .set(parsed.data)
      .where(eq(userSpotifyConnections.userId, auth.userId))
      .returning()
    if (!updated) {
      return ctx.json(
        { success: false, error: 'Spotify is not connected' },
        404,
      )
    }
    // Opt-in moment (auto-watch off → on): backfill currently-matched
    // upcoming shows into Watching. PR 10's fan-out only covers events that
    // land AFTER the flip, and the opt-in sheet promises "we'll add all N
    // now". Best-effort — the toggle write above already succeeded, and a
    // failed backfill is self-healing on the next explicit opt-in cycle.
    if (parsed.data.autoWatch === true && !row.autoWatch) {
      await backfillAutoWatch(auth.userId)
    }
    return ctx.json({ success: true, data: await toView(updated) })
  } catch (err) {
    apiLogger.error(
      { err, userId: auth.userId },
      'spotify: connection update failed',
    )
    return ctx.json(
      { success: false, error: 'Failed to update connection' },
      500,
    )
  }
})

// DELETE /v1/spotify/connection — explicit disconnect: purge artist rows +
// delete the connection row (unlike revoke, which retains it), then delete
// the Clerk external account so our grant is revoked (spec §3/§6).
spotifyRouter.delete('/connection', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const userId = auth.userId

  const row = await loadConnection(userId)
  if (!row)
    return ctx.json({ success: false, error: 'Spotify is not connected' }, 404)

  try {
    await db.transaction(async (tx) => {
      await purgeSpotifyFollows(tx, userId)
      await tx
        .delete(userSpotifyConnections)
        .where(eq(userSpotifyConnections.userId, userId))
    })
  } catch (err) {
    apiLogger.error({ err, userId }, 'spotify disconnect: purge failed')
    return ctx.json(
      { success: false, error: 'Failed to disconnect Spotify' },
      500,
    )
  }

  // Best-effort grant revoke: our data is already gone (the user-visible
  // promise), so a Clerk hiccup here logs loudly but still returns 204 —
  // a stale external account without a connection row is inert, and the
  // user can also remove it from the Clerk-managed account page.
  try {
    const clerkUser = await clerkClient.users.getUser(userId)
    const spotifyAccount = clerkUser.externalAccounts.find(isSpotifyAccount)
    if (spotifyAccount) {
      await clerkClient.users.deleteUserExternalAccount({
        userId,
        externalAccountId: spotifyAccount.id,
      })
    }
  } catch (err) {
    apiLogger.error(
      { err, userId },
      'spotify disconnect: Clerk external account delete failed',
    )
  }

  return ctx.body(null, 204)
})

// GET /v1/spotify/nudge — post-first-watch connect nudge gate (PR 5).
// Eligible only while the user has no connection row AND has never been
// shown the nudge (single-fire via user_profiles.spotify_nudge_seen_at).
spotifyRouter.get('/nudge', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const row = await loadConnection(auth.userId)
  if (row) {
    const data: SpotifyNudgeResponse = { eligible: false }
    return ctx.json({ success: true, data })
  }

  const [profile] = await db
    .select({ spotifyNudgeSeenAt: userProfiles.spotifyNudgeSeenAt })
    .from(userProfiles)
    .where(eq(userProfiles.userId, auth.userId))
    .limit(1)
  // No profile row yet = never seen — the seen write lazily creates the row.
  const data: SpotifyNudgeResponse = {
    eligible: !profile || profile.spotifyNudgeSeenAt === null,
  }
  return ctx.json({ success: true, data })
})

// POST /v1/spotify/nudge/seen — mark the nudge shown (fires when it is
// DISPLAYED, regardless of what the user taps — single-fire, spec §3).
// Lazy profile-row creation mirrors PATCH /v1/users/me.
spotifyRouter.post('/nudge/seen', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  try {
    // Idempotent upsert — the nudge can double-fire (two tabs, StrictMode),
    // so read-then-insert would race on the user_id unique constraint. The
    // conflict path touches only the nudge timestamp, never handle/theme.
    const seenAt = new Date()
    await db
      .insert(userProfiles)
      .values({ userId: auth.userId, spotifyNudgeSeenAt: seenAt })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { spotifyNudgeSeenAt: seenAt, updatedAt: seenAt },
      })
  } catch (err) {
    apiLogger.error(
      { err, userId: auth.userId },
      'spotify: nudge seen write failed',
    )
    return ctx.json({ success: false, error: 'Failed to record nudge' }, 500)
  }

  return ctx.json({ success: true })
})
