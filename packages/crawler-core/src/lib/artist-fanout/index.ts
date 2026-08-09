// New-show fan-out (#763 eng spec §10.1). After a venue crawl
// persists its events, the crawler calls runArtistFanoutSafely with the
// venue's *inserted* (brand-new) event ids. For every user whose follows
// match a new event (§9.1 canonical rule) — from ANY source, Spotify-synced
// or followed natively in-app:
//
//   - AUTO-WATCH (free): artist_auto_watch on → claim
//     spotify_alert_log (kind='auto_watch'), then upsert user_events
//     status='watching' (skipped if the user already has any row for the
//     event — an existing going/interested/watching is never overwritten).
//     A follower with no stored preference never auto-watches; the default
//     is off.
//   - PUSH (premium): artist_alerts_enabled on (the default for every
//     follower) AND canUseFeature(planState, 'following') → claim
//     spotify_alert_log (kind='push'), insert the #737 tray `notifications`
//     row, then send Web Push. Copy variant is keyed off autoWatch (design
//     lock).
//
// Preferences come from `user_notification_preferences`, which every user can
// have — `user_spotify_connections` is not read here at all, because Spotify
// is capped at 5 authenticated accounts and a native follower must get the
// same alerts.
//
// Exactly-once: both channels claim their (user, event, kind) row in
// spotify_alert_log FIRST via onConflictDoNothing().returning() — a re-crawl
// or retry that reaches the same pair simply fails to claim and does nothing.
//
// Batching: the CLAIM stays per (user, event, 'push') and the tray row stays
// per event (the tray is a list; collapsing it would lose the deep links).
// Only DELIVERY is coalesced — claimed pairs accumulate across the whole run
// and flush once per user at the end, so a nightly crawl that lands eight
// matches cannot fire eight pushes in ninety seconds.
//
// Failure isolation: runArtistFanoutSafely never throws (async-catch rule) —
// a fan-out bug can never fail a crawl. It is AWAITED by the crawler rather
// than detached because both crawler entrypoints hard-exit via
// process.exit(0), which would sever a floating promise mid-flight (the same
// #649 lesson as the crawl-failure emails).
import { and, eq, inArray, sql } from 'drizzle-orm'
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
  userNotificationPreferences,
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
  // Claims vs. deliveries: the gap between these two is the batching, and it
  // is the only way to prove from a prod log that coalescing happened.
  pushDeliveries: number
  failures: number
}

const EMPTY_SUMMARY: ArtistFanoutSummary = {
  newEvents: 0,
  matchedPairs: 0,
  autoWatched: 0,
  pushesClaimed: 0,
  pushDeliveries: 0,
  failures: 0,
}

interface MatchedConnection {
  userId: string
  canonicalName: string
  autoWatch: boolean
  pushEnabled: boolean
}

// One claimed (user, event) push, held until the run ends so a user's whole
// crawl can be delivered as a single notification.
interface PendingPush {
  eventId: string
  artist: string
  venueName: string
  dateLabel: string
  autoWatch: boolean
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

// One user's whole run, as one notification. A single claimed show keeps the
// design-locked single-show copy verbatim; two or more collapse.
const buildDelivery = (
  userId: string,
  pending: PendingPush[],
): SendPushInput | null => {
  const [first] = pending
  if (first === undefined) return null
  if (pending.length === 1) {
    return {
      userId,
      category: NEW_SHOW_CATEGORY,
      title: newShowCopy.title(first.artist),
      body: first.autoWatch
        ? newShowCopy.autoWatchBody(first.venueName, first.dateLabel)
        : newShowCopy.highlightBody(first.venueName, first.dateLabel),
      actionUrl: `/events/${first.eventId}`,
      // Stable tag so a duplicate delivery for the same event coalesces into
      // one OS notification.
      tag: `artist-new-show-${first.eventId}`,
    }
  }
  const artists = new Set(pending.map((push) => push.artist))
  const autoWatch = pending.every((push) => push.autoWatch)
  return {
    userId,
    category: NEW_SHOW_CATEGORY,
    // batchTitle counts artists, so one act playing two nights would read
    // "1 artists" without this branch.
    title:
      artists.size === 1
        ? newShowCopy.multiDateTitle(first.artist)
        : newShowCopy.batchTitle(artists.size),
    body: autoWatch
      ? newShowCopy.batchAutoWatchBody(pending.length)
      : newShowCopy.batchHighlightBody(pending.length),
    // There is no notifications page (the bell is a popover), so the batch
    // opens whichever list its body just named.
    actionUrl: autoWatch ? '/watching' : '/following',
    tag: 'artist-new-show-batch',
  }
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
      autoWatch: sql<boolean>`coalesce(${userNotificationPreferences.artistAutoWatch}, false)`,
      pushEnabled: sql<boolean>`coalesce(${userNotificationPreferences.artistAlertsEnabled}, true)`,
    })
    .from(userArtistFollows)
    // LEFT: preference rows are created lazily on the first PATCH, so most
    // followers have none and the coalesced defaults above must apply. An
    // inner join here would silently alert nobody who never opened Settings.
    .leftJoin(
      userNotificationPreferences,
      eq(userNotificationPreferences.userId, userArtistFollows.userId),
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

  const pendingByUser = new Map<string, PendingPush[]>()

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
              const dateLabel = newShowDateLabel(event.date)
              // The TRAY row stays per event — it is a list, and collapsing
              // it would lose the per-show deep link. Only delivery batches.
              await db.insert(notifications).values({
                userId: connection.userId,
                type: 'user_notification',
                category: NEW_SHOW_CATEGORY,
                title: newShowCopy.title(event.artist),
                body: connection.autoWatch
                  ? newShowCopy.autoWatchBody(event.venueName, dateLabel)
                  : newShowCopy.highlightBody(event.venueName, dateLabel),
                actionUrl: `/events/${event.id}`,
                metadata: JSON.stringify({ eventId: event.id }),
              })
              const pending = pendingByUser.get(connection.userId) ?? []
              pending.push({
                eventId: event.id,
                artist: event.artist,
                venueName: event.venueName,
                dateLabel,
                autoWatch: connection.autoWatch,
              })
              pendingByUser.set(connection.userId, pending)
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

  // Flush once per user, AWAITED — both crawler entrypoints process.exit(0),
  // which would sever a detached delivery mid-flight (#649).
  for (const [userId, pending] of pendingByUser) {
    const delivery = buildDelivery(userId, pending)
    if (delivery === null) continue
    try {
      await sendPush(delivery)
      summary.pushDeliveries += 1
    } catch (err) {
      summary.failures += 1
      fanoutLogger.error(
        { err, userId, pendingCount: pending.length },
        'artist-fanout: batched push delivery failed',
      )
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
