// apps/api/src/lib/spotify-sync.ts
//
// Reusable Spotify sync engine (#763, eng spec §8.1 phase 1). Called inline
// by POST /v1/spotify/connection (first sync) and /sync (on-demand refresh).
// Nothing runs it on a schedule: the weekly `spotify-weekly` cron used to, and
// no longer does, because a background import re-added artists the user had
// unfollowed here.
//
// Spotify is an import source, not a mirror. It seeds follow rows and never
// removes them — the user owns their follow list once it exists. Spec §4.2's
// replace-set semantics were withdrawn: they deleted a user's follows on any
// path they never asked for, including an expiring token.
//
// Semantics:
//   - Additive upsert per source inside one transaction: fresh rows insert,
//     already-known ones refresh their name/rank. Nothing is deleted. Removing
//     a follow is DELETE /v1/artists/:slug/follow and nothing else.
//   - Clerk token failure or Spotify 401 ⇒ status='revoked', connection row
//     retained for the Reconnect banner. Follows and Watching rows survive.
//   - Spotify 5xx / persistent 429 ⇒ status='error' + lastSyncError; the next
//     cycle retries.
//   - Every run writes a zero-dollar cost_tracking row with call counts (E10).
import { createClerkClient } from '@clerk/backend'
import * as Sentry from '@sentry/hono/node'
import { and, countDistinct, eq, inArray, sql } from 'drizzle-orm'
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

// External revoke / expired grant: RETAIN the connection row as
// status='revoked' so the UI can render the revoke banner + Reconnect CTA
// (spec §3). Explicit disconnect deletes the row instead.
//
// Follow rows are deliberately left alone. This path fires with no user
// action — a token expiring or a grant pulled from Spotify's side — and used
// to delete every imported follow with no way to get them back.
export async function markConnectionRevoked(
  userId: string,
  reason: string,
): Promise<void> {
  await db
    .update(userSpotifyConnections)
    .set({ status: 'revoked', lastSyncError: reason })
    .where(eq(userSpotifyConnections.userId, userId))
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

// Additive by design. Spotify seeds follows; it does not own them. Unfollowing
// an artist on Spotify — or losing the grant entirely — must never silently
// remove a follow the user made here, so nothing in the import path deletes.
// Only the user, via DELETE /v1/artists/:slug/follow, removes a follow.
async function importSourceSet(
  tx: DbExecutor,
  rows: FollowUpsertRow[],
): Promise<void> {
  if (rows.length === 0) return
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

// One user's import: Clerk token, followed + top pull, additive upsert,
// connection bookkeeping. The two callers are both user-initiated (connect and
// Refresh in Settings); no job runs this on a schedule. Spotify/Clerk failures
// never throw, mapping to connection status instead so callers can just re-read
// the row. Only a DB-layer failure on the bookkeeping reads and writes
// themselves can still reject.
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
  let persistedArtistCount = connection.artistCount

  try {
    await db.transaction(async (tx) => {
      await importSourceSet(tx, followedRows)
      await importSourceSet(tx, topRows)
      // Count the rows on the table, not the size of this pull. Imports are
      // additive and a native unfollow can remove a row, so the two diverge —
      // and `artistCount > 0` is what decides whether the events list
      // personalizes, so a shrinking pull must not read as no taste at all.
      const [counted] = await tx
        .select({ value: countDistinct(userArtistFollows.spotifyArtistId) })
        .from(userArtistFollows)
        .where(
          and(
            eq(userArtistFollows.userId, userId),
            inArray(userArtistFollows.source, [
              'spotify_followed',
              'spotify_top',
            ]),
          ),
        )
      persistedArtistCount = counted?.value ?? 0
      await tx
        .update(userSpotifyConnections)
        .set({
          status: 'connected',
          artistCount: persistedArtistCount,
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

  return { outcome: 'synced', artistCount: persistedArtistCount }
}
