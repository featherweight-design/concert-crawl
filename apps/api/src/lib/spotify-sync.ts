// apps/api/src/lib/spotify-sync.ts
//
// Reusable Spotify sync engine (#763, eng spec §8.1 phase 1). Called inline
// by POST /v1/spotify/connection (first sync) and /sync (on-demand refresh),
// and by the weekly `spotify-weekly` cron in PR 4.
//
// Semantics per spec §4.2/§3:
//   - Replace-set per source inside one transaction: rows for (userId, source)
//     absent from the fresh pull are deleted, the rest upserted. A mid-sync
//     crash leaves the previous set intact. `source='manual'` rows are never
//     touched.
//   - Clerk token failure or Spotify 401 ⇒ status='revoked' + immediate purge
//     of Spotify-sourced follow rows (connection row retained for the
//     Reconnect banner). Watching rows always survive.
//   - Spotify 5xx / persistent 429 ⇒ status='error' + lastSyncError; the
//     previous artist set is preserved and the next cycle retries.
//   - Every run writes a zero-dollar cost_tracking row with call counts (E10).
import { createClerkClient } from '@clerk/backend'
import * as Sentry from '@sentry/hono/node'
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  costTracking,
  userArtistFollows,
  userSpotifyConnections,
} from '@concert-crawl/db'
import type { Database } from '@concert-crawl/db'
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical'
import { apiLogger } from './logger.js'
import {
  createSpotifyClient,
  SpotifyAuthError,
  type SpotifyArtistItem,
} from './spotify.js'

const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
const clerkClient = createClerkClient({ secretKey })

export const SPOTIFY_FOLLOW_SOURCES = [
  'spotify_followed',
  'spotify_top',
] as const

type SpotifySource = (typeof SPOTIFY_FOLLOW_SOURCES)[number]

// Executor accepted so the purge can join a larger transaction (disconnect
// deletes the connection row in the same tx; revoke pairs it with the status
// flip). Drizzle's transaction handle shares the Database query surface.
type DbExecutor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0]

export type SpotifySyncOutcome =
  'synced' | 'error' | 'revoked' | 'no-connection'

export interface SpotifySyncResult {
  outcome: SpotifySyncOutcome
  artistCount: number
  error?: string
}

// Shared purge (spec §6 purge invariant): only Spotify-sourced follow rows
// are deleted. Manual follows and user_events (watching) rows are untouched.
export async function purgeSpotifyFollows(
  executor: DbExecutor,
  userId: string,
): Promise<void> {
  await executor
    .delete(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, userId),
        inArray(userArtistFollows.source, [...SPOTIFY_FOLLOW_SOURCES]),
      ),
    )
}

// External revoke / expired grant: purge artist rows but RETAIN the
// connection row as status='revoked' so the UI can render the revoke banner
// + Reconnect CTA (spec §3). Explicit disconnect deletes the row instead.
export async function markConnectionRevoked(
  userId: string,
  reason: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await purgeSpotifyFollows(tx, userId)
    await tx
      .update(userSpotifyConnections)
      .set({ status: 'revoked', lastSyncError: reason, artistCount: 0 })
      .where(eq(userSpotifyConnections.userId, userId))
  })
}

export type SpotifyTokenResult =
  | { status: 'ok'; token: string }
  | { status: 'no-grant' }
  | { status: 'error'; message: string }

// Clerk stores the reason an OAuth link failed on the external account's
// `verification` object, and it is the only place the useful diagnostic
// lives — `getUserOauthAccessToken` just returns 200 with an empty array.
// Parsed rather than cast because this is SDK-shaped data crossing a
// boundary and every field is optional in practice on a failed link.
const externalAccountVerificationSchema = z.object({
  status: z.string().nullish(),
  error: z
    .object({
      code: z.string().nullish(),
      message: z.string().nullish(),
      longMessage: z.string().nullish(),
    })
    .nullish(),
})

const UNKNOWN_CLERK_OAUTH_ERROR = 'unknown'

// Best-effort diagnostic read. A failure here must never change the caller's
// outcome — we are already on the no-grant path and this only enriches it.
async function reportMissingSpotifyGrant(userId: string): Promise<void> {
  let verification: z.infer<typeof externalAccountVerificationSchema> | null =
    null
  try {
    const user = await clerkClient.users.getUser(userId)
    const account = user.externalAccounts.find(
      (row) => row.provider === 'oauth_spotify' || row.provider === 'spotify',
    )
    const parsed = externalAccountVerificationSchema.safeParse(
      account?.verification,
    )
    if (parsed.success) verification = parsed.data
  } catch (err) {
    apiLogger.warn(
      { err, userId },
      'spotify: could not read Clerk external-account verification state',
    )
  }

  const errorCode = verification?.error?.code ?? UNKNOWN_CLERK_OAUTH_ERROR
  const payload = {
    userId,
    verificationStatus: verification?.status ?? UNKNOWN_CLERK_OAUTH_ERROR,
    clerkErrorCode: errorCode,
    clerkErrorMessage:
      verification?.error?.longMessage ?? verification?.error?.message ?? null,
  }
  // Guarded separately from the Clerk read: a Sentry transport or config
  // failure must not propagate out of a best-effort reporter and turn the
  // caller's `no-grant` into an `error`.
  try {
    apiLogger.warn(
      payload,
      'spotify: Clerk returned no OAuth token — link never completed',
    )
    // Tagged by Clerk's error code so distinct failure modes group separately
    // in Sentry — `oauth_identification_claimed` (a real account conflict the
    // user must resolve) should not be averaged in with transient ones (#1159).
    Sentry.captureMessage(
      'spotify: Clerk returned no OAuth token — link never completed',
      {
        level: 'warning',
        tags: { spotify_oauth_no_token: '1', clerk_oauth_error: errorCode },
        extra: payload,
      },
    )
  } catch (err) {
    apiLogger.warn(
      { err, userId },
      'spotify: failed to emit no-OAuth-token telemetry',
    )
  }
}

const hasNumericStatus = (err: unknown): err is { status: number } =>
  typeof err === 'object' &&
  err !== null &&
  'status' in err &&
  typeof err.status === 'number'

// Live access token via Clerk (E1) — Clerk stores + refreshes; nothing
// persists in our DB. 'no-grant' (empty token list or a Clerk 4xx) means the
// grant is gone and drives the revoke path; transient Clerk failures
// (network/5xx) map to 'error' so a Clerk blip never purges the user's
// artist set.
export async function getSpotifyAccessToken(
  userId: string,
): Promise<SpotifyTokenResult> {
  try {
    const tokens = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'spotify',
    )
    const token = tokens.data[0]?.token
    if (typeof token !== 'string' || token.length === 0) {
      // Clerk answers 200-with-no-tokens when the OAuth link exists but
      // verification never completed. That used to return silently, so the
      // user saw a generic 400 and we had no telemetry at all (#1159).
      await reportMissingSpotifyGrant(userId)
      return { status: 'no-grant' }
    }
    return { status: 'ok', token }
  } catch (err) {
    if (hasNumericStatus(err) && err.status >= 400 && err.status < 500) {
      apiLogger.warn({ err, userId }, 'spotify: Clerk reports no OAuth grant')
      return { status: 'no-grant' }
    }
    apiLogger.warn({ err, userId }, 'spotify: Clerk OAuth token fetch failed')
    return {
      status: 'error',
      message:
        err instanceof Error ? err.message : 'Clerk OAuth token fetch failed',
    }
  }
}

interface SyncCostMeta {
  userId: string
  outcome: SpotifySyncOutcome
  apiCalls: number
  followedCount?: number
  topCount?: number
}

// E10: zero-dollar observability row. Best-effort — cost bookkeeping must
// never fail a sync.
async function recordSyncCost(meta: SyncCostMeta): Promise<void> {
  try {
    await db.insert(costTracking).values({
      service: 'spotify',
      costUsd: '0',
      metadata: JSON.stringify(meta),
    })
  } catch (err) {
    apiLogger.error(
      { err, userId: meta.userId },
      'spotify: cost_tracking insert failed',
    )
  }
}

interface FollowUpsertRow {
  userId: string
  artistName: string
  spotifyArtistId: string
  source: SpotifySource
  canonicalName: string
  rank: number | null
  lastSyncedAt: Date
}

function buildRows(
  userId: string,
  source: SpotifySource,
  artists: SpotifyArtistItem[],
  syncedAt: Date,
): FollowUpsertRow[] {
  const seen = new Set<string>()
  const rows: FollowUpsertRow[] = []
  for (const [position, item] of artists.entries()) {
    // Dedupe by Spotify id — a duplicate in one upsert statement would hit
    // "ON CONFLICT DO UPDATE command cannot affect row a second time".
    if (seen.has(item.id)) continue
    seen.add(item.id)
    rows.push({
      userId,
      artistName: item.name,
      spotifyArtistId: item.id,
      source,
      // Parity rule: canonical form is computed ONLY by the shared JS
      // canonicalizeArtist — same function the crawler writes with.
      canonicalName: canonicalizeArtist(item.name),
      rank: source === 'spotify_top' ? position + 1 : null,
      lastSyncedAt: syncedAt,
    })
  }
  return rows
}

async function replaceSourceSet(
  tx: DbExecutor,
  userId: string,
  source: SpotifySource,
  rows: FollowUpsertRow[],
): Promise<void> {
  const scope = and(
    eq(userArtistFollows.userId, userId),
    eq(userArtistFollows.source, source),
  )
  if (rows.length === 0) {
    await tx.delete(userArtistFollows).where(scope)
    return
  }
  const freshIds = rows.map((row) => row.spotifyArtistId)
  await tx
    .delete(userArtistFollows)
    .where(and(scope, notInArray(userArtistFollows.spotifyArtistId, freshIds)))
  await tx
    .insert(userArtistFollows)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        userArtistFollows.userId,
        userArtistFollows.source,
        userArtistFollows.spotifyArtistId,
      ],
      set: {
        artistName: sql`excluded.artist_name`,
        canonicalName: sql`excluded.canonical_name`,
        rank: sql`excluded.rank`,
        lastSyncedAt: sql`excluded.last_synced_at`,
      },
    })
}

// Phase-1 sync for one user: Clerk token → followed + top pull → canonical
// replace-set upsert → connection bookkeeping. Spotify/Clerk failures never
// throw — they map to connection status so callers (routes now, weekly cron
// in PR 4) can just re-read the row. Only a DB-layer failure on the
// bookkeeping reads/writes themselves can still reject.
export async function syncSpotifyConnection(
  userId: string,
): Promise<SpotifySyncResult> {
  const [connection] = await db
    .select()
    .from(userSpotifyConnections)
    .where(eq(userSpotifyConnections.userId, userId))
    .limit(1)
  if (!connection) return { outcome: 'no-connection', artistCount: 0 }

  const tokenResult = await getSpotifyAccessToken(userId)
  if (tokenResult.status === 'no-grant') {
    const reason = 'Spotify access token unavailable — grant revoked?'
    await markConnectionRevoked(userId, reason)
    await recordSyncCost({ userId, outcome: 'revoked', apiCalls: 0 })
    return { outcome: 'revoked', artistCount: 0, error: reason }
  }
  if (tokenResult.status === 'error') {
    await db
      .update(userSpotifyConnections)
      .set({ status: 'error', lastSyncError: tokenResult.message })
      .where(eq(userSpotifyConnections.userId, userId))
    await recordSyncCost({ userId, outcome: 'error', apiCalls: 0 })
    return {
      outcome: 'error',
      artistCount: connection.artistCount,
      error: tokenResult.message,
    }
  }

  const client = createSpotifyClient(tokenResult.token)
  let followed: SpotifyArtistItem[]
  let top: SpotifyArtistItem[]
  try {
    followed = await client.getFollowedArtists()
    top = await client.getTopArtists()
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      apiLogger.warn(
        { err, userId },
        'spotify: 401 during sync — marking revoked',
      )
      await markConnectionRevoked(userId, err.message)
      await recordSyncCost({
        userId,
        outcome: 'revoked',
        apiCalls: client.getCallCount(),
      })
      return { outcome: 'revoked', artistCount: 0, error: err.message }
    }
    const message = err instanceof Error ? err.message : 'Spotify sync failed'
    apiLogger.error({ err, userId }, 'spotify: sync failed')
    await db
      .update(userSpotifyConnections)
      .set({ status: 'error', lastSyncError: message })
      .where(eq(userSpotifyConnections.userId, userId))
    await recordSyncCost({
      userId,
      outcome: 'error',
      apiCalls: client.getCallCount(),
    })
    return {
      outcome: 'error',
      artistCount: connection.artistCount,
      error: message,
    }
  }

  const syncedAt = new Date()
  const followedRows = buildRows(userId, 'spotify_followed', followed, syncedAt)
  const topRows = buildRows(userId, 'spotify_top', top, syncedAt)
  const distinctArtistCount = new Set(
    [...followedRows, ...topRows].map((row) => row.spotifyArtistId),
  ).size

  try {
    await db.transaction(async (tx) => {
      await replaceSourceSet(tx, userId, 'spotify_followed', followedRows)
      await replaceSourceSet(tx, userId, 'spotify_top', topRows)
      await tx
        .update(userSpotifyConnections)
        .set({
          status: 'connected',
          artistCount: distinctArtistCount,
          lastSyncedAt: syncedAt,
          lastSyncError: null,
        })
        .where(eq(userSpotifyConnections.userId, userId))
    })
  } catch (err) {
    // Transaction rollback leaves the previous artist set intact; surface the
    // failure on the connection row so callers see status='error'. The status
    // write gets its own catch (best effort — a fully-down DB would otherwise
    // throw again from inside this error path).
    const message = err instanceof Error ? err.message : 'Spotify sync failed'
    apiLogger.error({ err, userId }, 'spotify: sync persistence failed')
    try {
      await db
        .update(userSpotifyConnections)
        .set({ status: 'error', lastSyncError: message })
        .where(eq(userSpotifyConnections.userId, userId))
    } catch (statusErr) {
      apiLogger.error(
        { err: statusErr, userId },
        'spotify: failed to record sync error status',
      )
    }
    await recordSyncCost({
      userId,
      outcome: 'error',
      apiCalls: client.getCallCount(),
    })
    return {
      outcome: 'error',
      artistCount: connection.artistCount,
      error: message,
    }
  }

  await recordSyncCost({
    userId,
    outcome: 'synced',
    apiCalls: client.getCallCount(),
    followedCount: followedRows.length,
    topCount: topRows.length,
  })

  return { outcome: 'synced', artistCount: distinctArtistCount }
}
