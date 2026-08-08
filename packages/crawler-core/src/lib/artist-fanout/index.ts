// New-show fan-out (#763 eng spec §10.1). After a venue crawl
// persists its events, the crawler calls runArtistFanoutSafely with the
// venue's *inserted* (brand-new) event ids. For every user whose follows
// match a new event (§9.1 canonical rule) — from ANY source, Spotify-synced
// or followed natively in-app:
//
//   - AUTO-WATCH (free): connection has autoWatch on → claim
//     spotify_alert_log (kind='auto_watch'), then upsert user_events
//     status='watching' (skipped if the user already has any row for the
//     event — an existing going/interested/watching is never overwritten).
//     A follower with no connection never auto-watches; the default is off.
//   - PUSH (premium): pushEnabled on (the default for a native follower) AND
//     canUseFeature(planState, 'following') → claim spotify_alert_log
//     (kind='push'), insert the #737 tray `notifications` row, then send Web
//     Push. Copy variant is keyed off autoWatch (design lock).
//
// Exactly-once: both channels claim their (user, event, kind) row in
// spotify_alert_log FIRST via onConflictDoNothing().returning() — a re-crawl
// or retry that reaches the same pair simply fails to claim and does nothing.
//
// Failure isolation: runArtistFanoutSafely never throws (async-catch rule) —
// a fan-out bug can never fail a crawl. It is AWAITED by the crawler rather
// than detached because both crawler entrypoints hard-exit via
// process.exit(0), which would sever a floating promise mid-flight (the same
// #649 lesson as the crawl-failure emails).
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import {
  db,
  events,
  giftedComps,
  notifications,
  spotifyAlertLog,
  subscriptions,
  userArtistFollows,
  userBilling,
  userEvents,
  userSpotifyConnections,
  venues,
} from '@concert-crawl/db'
import { canUseFeature, derivePlanState } from '@concert-crawl/entitlements'
import { createLogger } from '@concert-crawl/logger'
import {
  sendPushForNotification,
  type SendPushInput,
} from '@concert-crawl/push'
import type { PlanState } from '@concert-crawl/types'
import { z } from 'zod'
import { newShowDateLabel, newShowCopy } from './definitions/copy.js'

const fanoutLogger = createLogger('artist-fanout')

const NEW_SHOW_CATEGORY = 'artist.new_show'

// Clerk publicMetadata is untyped at the boundary — parsed, never cast.
const publicMetadataSchema = z.object({ role: z.string().optional() })

// Role fetch for role-comped plan derivation. Optional by design: the
// crawler crons only carry CLERK_SECRET_KEY so admin/team accounts derive as
// comped; without it (or on any Clerk blip) derivation proceeds role-less
// and DB rows still decide paid plans — same fallback the weekly digest
// uses.
const fetchClerkRole = async (userId: string): Promise<string | undefined> => {
  const secretKey = process.env['CLERK_SECRET_KEY']
  if (secretKey === undefined || secretKey.length === 0) return undefined
  try {
    const { createClerkClient } = await import('@clerk/backend')
    const clerk = createClerkClient({ secretKey })
    const user = await clerk.users.getUser(userId)
    const parsed = publicMetadataSchema.safeParse(user.publicMetadata)
    return parsed.success ? parsed.data.role : undefined
  } catch (err) {
    fanoutLogger.warn(
      { err, userId },
      'artist-fanout: Clerk role fetch failed — deriving plan without it',
    )
    return undefined
  }
}

// Same derivation inputs as apps/api's loadPlanContext, queried locally so
// the crawler never imports API code (the whole point of moving
// derivePlanState into @concert-crawl/entitlements).
const loadPlanStateForUser = async (
  userId: string,
  getRole: (userId: string) => Promise<string | undefined>,
  now: Date,
): Promise<PlanState> => {
  const [[giftRow], [subRow], [billingRow], role] = await Promise.all([
    db
      .select({
        revokedAt: giftedComps.revokedAt,
        expiresAt: giftedComps.expiresAt,
      })
      .from(giftedComps)
      .where(eq(giftedComps.userId, userId))
      .limit(1),
    db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1),
    db
      .select({ trialEndsAt: userBilling.trialEndsAt })
      .from(userBilling)
      .where(eq(userBilling.userId, userId))
      .limit(1),
    getRole(userId),
  ])
  return derivePlanState({
    userId,
    role,
    giftedComp: giftRow ?? null,
    subscription: subRow ?? null,
    billing: billingRow ?? null,
    now,
  })
}

export interface ArtistFanoutDeps {
  // Injectable for tests; production uses the real Web Push sender.
  sendPush?: (input: SendPushInput) => Promise<unknown>
  // Injectable for tests; production lazily fetches the Clerk role.
  getRole?: (userId: string) => Promise<string | undefined>
  now?: Date
}

export interface ArtistFanoutSummary {
  newEvents: number
  matchedPairs: number
  autoWatched: number
  pushesClaimed: number
  failures: number
}

const EMPTY_SUMMARY: ArtistFanoutSummary = {
  newEvents: 0,
  matchedPairs: 0,
  autoWatched: 0,
  pushesClaimed: 0,
  failures: 0,
}

interface MatchedConnection {
  userId: string
  canonicalName: string
  autoWatch: boolean
  pushEnabled: boolean
}

// Attempt to claim the (user, event, kind) ledger row. True = this call owns
// the side effect; false = already claimed by an earlier run.
const claimAlert = async (
  userId: string,
  eventId: string,
  kind: 'push' | 'auto_watch',
): Promise<boolean> => {
  const claimed = await db
    .insert(spotifyAlertLog)
    .values({ userId, eventId, kind })
    .onConflictDoNothing()
    .returning({ id: spotifyAlertLog.id })
  return claimed.length > 0
}

export async function runArtistFanout(
  insertedEventIds: string[],
  deps: ArtistFanoutDeps = {},
): Promise<ArtistFanoutSummary> {
  if (insertedEventIds.length === 0) return { ...EMPTY_SUMMARY }

  const sendPush = deps.sendPush ?? sendPushForNotification
  const getRole = deps.getRole ?? fetchClerkRole
  const now = deps.now ?? new Date()

  // Consumer-visible new events only — a hidden or already-cancelled insert
  // never alerts anyone.
  const newEvents = await db
    .select({
      id: events.id,
      artist: events.artist,
      date: events.date,
      canonicalArtist: events.canonicalArtist,
      canonicalSupporting: events.canonicalSupporting,
      venueName: venues.name,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        inArray(events.id, insertedEventIds),
        eq(events.status, 'upcoming'),
        eq(events.hiddenFromConsumer, false),
      ),
    )

  const summary: ArtistFanoutSummary = {
    ...EMPTY_SUMMARY,
    newEvents: newEvents.length,
  }

  // One batched candidate query for the whole crawl (§9.1 canonical match),
  // then pure in-memory per-event overlap — no per-event queries. EVERY follow
  // source participates: the Spotify connection is now only a source of
  // notification preferences, never a condition of entry.
  const allCanonicalNames = [
    ...new Set(
      newEvents.flatMap((event) => [
        ...(event.canonicalArtist !== null ? [event.canonicalArtist] : []),
        ...(event.canonicalSupporting ?? []),
      ]),
    ),
  ].filter((name) => name.length > 0)
  if (allCanonicalNames.length === 0) return summary

  const candidates: MatchedConnection[] = await db
    .selectDistinct({
      // From the follow, not the connection — a manual follower has no
      // connection row and would otherwise select as null.
      userId: userArtistFollows.userId,
      canonicalName: userArtistFollows.canonicalName,
      // Defaults are deliberately asymmetric, and applied here in SQL so no
      // downstream consumer can forget them: pushEnabled defaults TRUE
      // (following IS the opt-in), autoWatch defaults FALSE (following must
      // never silently mutate someone's Watching list).
      autoWatch: sql<boolean>`coalesce(${userSpotifyConnections.autoWatch}, false)`,
      pushEnabled: sql<boolean>`coalesce(${userSpotifyConnections.pushEnabled}, true)`,
    })
    .from(userArtistFollows)
    // LEFT, and the revoked check lives INSIDE the join condition. In the
    // WHERE clause it would filter the null-connection rows straight back
    // out, reinstating the inner join it replaced.
    .leftJoin(
      userSpotifyConnections,
      and(
        eq(userSpotifyConnections.userId, userArtistFollows.userId),
        ne(userSpotifyConnections.status, 'revoked'),
      ),
    )
    .where(inArray(userArtistFollows.canonicalName, allCanonicalNames))
  if (candidates.length === 0) return summary

  const usersByCanonical = new Map<string, MatchedConnection[]>()
  for (const candidate of candidates) {
    const list = usersByCanonical.get(candidate.canonicalName) ?? []
    list.push(candidate)
    usersByCanonical.set(candidate.canonicalName, list)
  }

  // Plan derivation is per-user (not per-pair) — cached promise so a user
  // matched by several new events costs one derivation.
  const planCache = new Map<string, Promise<PlanState>>()
  const planFor = (userId: string): Promise<PlanState> => {
    let cached = planCache.get(userId)
    if (!cached) {
      cached = loadPlanStateForUser(userId, getRole, now)
      planCache.set(userId, cached)
    }
    return cached
  }

  for (const event of newEvents) {
    const eventCanonicals = [
      ...(event.canonicalArtist !== null ? [event.canonicalArtist] : []),
      ...(event.canonicalSupporting ?? []),
    ]
    const matchedByUser = new Map<string, MatchedConnection>()
    for (const canonical of eventCanonicals) {
      for (const candidate of usersByCanonical.get(canonical) ?? []) {
        matchedByUser.set(candidate.userId, candidate)
      }
    }

    for (const connection of matchedByUser.values()) {
      summary.matchedPairs += 1
      // Per-pair isolation: one user's failure never halts the fan-out.
      try {
        if (connection.autoWatch) {
          const claimed = await claimAlert(
            connection.userId,
            event.id,
            'auto_watch',
          )
          if (claimed) {
            // onConflictDoNothing on the (user, event) unique index — an
            // existing going/interested/watching row is never overwritten.
            await db
              .insert(userEvents)
              .values({
                userId: connection.userId,
                eventId: event.id,
                status: 'watching',
              })
              .onConflictDoNothing()
            summary.autoWatched += 1
          }
        }

        if (connection.pushEnabled) {
          const planState = await planFor(connection.userId)
          // Gated on `following`, not `spotify-sync` — the alert belongs to
          // the follow that earned it, whatever source created it.
          if (canUseFeature(planState, 'following')) {
            const claimed = await claimAlert(
              connection.userId,
              event.id,
              'push',
            )
            if (claimed) {
              const title = newShowCopy.title(event.artist)
              const dateLabel = newShowDateLabel(event.date)
              const body = connection.autoWatch
                ? newShowCopy.autoWatchBody(event.venueName, dateLabel)
                : newShowCopy.highlightBody(event.venueName, dateLabel)
              const actionUrl = `/events/${event.id}`
              // Tray row first (#737 back-fill), then push — sendPush is
              // best-effort and never throws, so a delivery failure still
              // leaves the tray row (and the claim) in place.
              await db.insert(notifications).values({
                userId: connection.userId,
                type: 'user_notification',
                category: NEW_SHOW_CATEGORY,
                title,
                body,
                actionUrl,
                metadata: JSON.stringify({ eventId: event.id }),
              })
              await sendPush({
                userId: connection.userId,
                category: NEW_SHOW_CATEGORY,
                title,
                body,
                actionUrl,
                // Stable tag so a duplicate delivery for the same event
                // coalesces into one OS notification.
                tag: `artist-new-show-${event.id}`,
              })
              summary.pushesClaimed += 1
            }
          }
        }
      } catch (err) {
        summary.failures += 1
        fanoutLogger.error(
          { err, userId: connection.userId, eventId: event.id },
          'artist-fanout: user/event pair failed',
        )
      }
    }
  }

  return summary
}

// Crawler-facing wrapper: never throws (a fan-out bug can never fail a
// crawl). Returns null on a run-level failure so callers can log-and-move-on.
export async function runArtistFanoutSafely(
  insertedEventIds: string[],
  deps: ArtistFanoutDeps = {},
): Promise<ArtistFanoutSummary | null> {
  try {
    const summary = await runArtistFanout(insertedEventIds, deps)
    if (summary.newEvents > 0) {
      fanoutLogger.info({ summary }, 'artist-fanout: run complete')
    }
    return summary
  } catch (err) {
    fanoutLogger.error(
      { err, insertedCount: insertedEventIds.length },
      'artist-fanout: run failed — crawl unaffected',
    )
    return null
  }
}
