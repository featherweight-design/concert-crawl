import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  events,
  notifications,
  spotifyAlertLog,
  subscriptions,
  userArtistFollows,
  userEvents,
  userNotificationPreferences,
  userSpotifyConnections,
  venues,
} from '@concert-crawl/db'
import { runArtistFanout, runArtistFanoutSafely } from './index.js'

// Real-Postgres coverage for the #763 §10.1 fan-out: the exactly-once
// spotify_alert_log claims, the free/premium channel gating, and the §9.1
// canonical matching all depend on real unique indexes + array overlap —
// none of which the in-memory mock models.

const FREE_USER = 'user_fanout_free'
const PREMIUM_USER = 'user_fanout_premium'
const BYSTANDER_USER = 'user_fanout_bystander'

async function clearFanoutState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, notifications, spotify_alert_log, user_events, user_artist_follows, user_notification_preferences, user_spotify_connections, subscriptions, gifted_comps, user_billing RESTART IDENTITY CASCADE`,
  )
}

async function seedVenue(name: string): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name,
      slug: `fanout-${crypto.randomUUID()}`,
      websiteUrl: 'https://fanout-test.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
    })
    .returning({ id: venues.id })
  if (!venue) throw new Error('venue insert returned no row')
  return venue.id
}

interface SeedEventInput {
  venueId: string
  artist: string
  canonicalArtist: string
  canonicalSupporting?: string[]
  date?: string
  hiddenFromConsumer?: boolean
}

async function seedEvent(input: SeedEventInput): Promise<string> {
  const [event] = await db
    .insert(events)
    .values({
      venueId: input.venueId,
      title: `${input.artist} Live`,
      artist: input.artist,
      date: input.date ?? '2026-10-12',
      canonicalArtist: input.canonicalArtist,
      canonicalTitle: `${input.canonicalArtist}-${crypto.randomUUID()}`,
      canonicalSupporting: input.canonicalSupporting ?? null,
      hiddenFromConsumer: input.hiddenFromConsumer ?? false,
    })
    .returning({ id: events.id })
  if (!event) throw new Error('event insert returned no row')
  return event.id
}

interface SeedFollowerInput {
  userId: string
  canonicalName: string
  autoWatch?: boolean
  pushEnabled?: boolean
  status?: 'connected' | 'error' | 'revoked'
}

// A Spotify-sourced follower. The connection row is seeded with its LEGACY
// columns left at their defaults on purpose — preferences now live in
// user_notification_preferences, so any test asserting autoWatch would fail
// loudly if the fan-out ever read the connection again.
async function seedFollower(input: SeedFollowerInput): Promise<void> {
  await db.insert(userSpotifyConnections).values({
    userId: input.userId,
    spotifyUserId: `spotify_${input.userId}`,
    status: input.status ?? 'connected',
  })
  await seedPrefs(input)
  await db.insert(userArtistFollows).values({
    userId: input.userId,
    artistName: input.canonicalName,
    spotifyArtistId: `artist_${crypto.randomUUID()}`,
    source: 'spotify_followed',
    canonicalName: input.canonicalName,
  })
}

async function seedPrefs(input: {
  userId: string
  autoWatch?: boolean
  pushEnabled?: boolean
}): Promise<void> {
  await db
    .insert(userNotificationPreferences)
    .values({
      userId: input.userId,
      artistAutoWatch: input.autoWatch ?? false,
      artistAlertsEnabled: input.pushEnabled ?? true,
    })
    .onConflictDoUpdate({
      target: userNotificationPreferences.userId,
      set: {
        artistAutoWatch: input.autoWatch ?? false,
        artistAlertsEnabled: input.pushEnabled ?? true,
      },
    })
}

// A follow with NO connection row — the manual-only user, which seedFollower
// cannot represent because it always pairs a follow with a connection.
async function seedManualFollow(input: {
  userId: string
  canonicalName: string
}): Promise<void> {
  await db.insert(userArtistFollows).values({
    userId: input.userId,
    artistName: input.canonicalName,
    spotifyArtistId: null,
    source: 'manual',
    canonicalName: input.canonicalName,
  })
}

// A live premium subscription — canUseFeature(plan, 'following') active.
async function seedPremiumSubscription(userId: string): Promise<void> {
  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })
}

const noRole = async (): Promise<undefined> => undefined

const makeSendPush = () =>
  vi.fn().mockResolvedValue({ delivered: 1, skipped: null })

beforeEach(async () => {
  await clearFanoutState()
})

describe('runArtistFanout — channel gating (#763 §10.1)', () => {
  it('free tier gets auto-watch only; premium gets push + tray row', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: FREE_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      pushEnabled: true,
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: false,
      pushEnabled: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({
      newEvents: 1,
      matchedPairs: 2,
      autoWatched: 1,
      pushesClaimed: 1,
      failures: 0,
    })

    // Free user: watching row, no push, no tray row.
    const freeWatch = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, FREE_USER))
    expect(freeWatch).toHaveLength(1)
    expect(freeWatch[0]?.status).toBe('watching')
    const freeTray = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, FREE_USER))
    expect(freeTray).toHaveLength(0)

    // Premium user: push fired with the highlight (autoWatch-off) copy.
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush).toHaveBeenCalledWith({
      userId: PREMIUM_USER,
      category: 'artist.new_show',
      title: 'Big Head Todd: new Denver date',
      body: 'Fillmore · Oct 12. Want in? Tap to watch.',
      actionUrl: `/events/${eventId}`,
      tag: `artist-new-show-${eventId}`,
    })
    const premiumTray = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, PREMIUM_USER))
    expect(premiumTray).toHaveLength(1)
    expect(premiumTray[0]).toMatchObject({
      type: 'user_notification',
      category: 'artist.new_show',
      actionUrl: `/events/${eventId}`,
    })

    // Ledger: one auto_watch claim (free) + one push claim (premium).
    const ledger = await db.select().from(spotifyAlertLog)
    expect(ledger).toHaveLength(2)
  })

  it('premium user with autoWatch on gets both channels and the Watching copy variant', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      pushEnabled: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ autoWatched: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Fillmore · Oct 12. Added to your Watching.',
      }),
    )
  })

  it('pushEnabled=false skips push for a premium user but auto-watch still fires', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      pushEnabled: false,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({
      matchedPairs: 1,
      autoWatched: 1,
      pushesClaimed: 0,
    })
    expect(sendPush).not.toHaveBeenCalled()
    const tray = await db.select().from(notifications)
    expect(tray).toHaveLength(0)
  })

  it('never overwrites an existing user_events row (going stays going)', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: FREE_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
    })
    await db
      .insert(userEvents)
      .values({ userId: FREE_USER, eventId, status: 'going' })

    const summary = await runArtistFanout([eventId], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })

    // The claim still lands (the alert is "handled") but the row is intact.
    expect(summary.autoWatched).toBe(1)
    const [row] = await db
      .select()
      .from(userEvents)
      .where(
        and(eq(userEvents.userId, FREE_USER), eq(userEvents.eventId, eventId)),
      )
    expect(row?.status).toBe('going')
  })
})

describe('runArtistFanout — matching + idempotency', () => {
  it('matches via canonical_supporting overlap', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Headliner Act',
      canonicalArtist: 'headliner act',
      canonicalSupporting: ['opener band', 'second opener'],
    })
    await seedFollower({
      userId: FREE_USER,
      canonicalName: 'second opener',
      autoWatch: true,
    })

    const summary = await runArtistFanout([eventId], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, autoWatched: 1 })
    const watch = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, FREE_USER))
    expect(watch).toHaveLength(1)
  })

  // Fan-out bugs are invisible from a single account: an over-broad match
  // still looks correct to the user who was supposed to get the alert. The
  // bystander here is equally premium and equally push-enabled, so the ONLY
  // thing keeping them out is the canonical match.
  it('reaches the matching follower and nobody else', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)
    await seedFollower({
      userId: BYSTANDER_USER,
      canonicalName: 'someone else entirely',
      autoWatch: true,
    })
    await seedPremiumSubscription(BYSTANDER_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush.mock.calls[0]?.[0]).toMatchObject({ userId: PREMIUM_USER })
    const bystanderTray = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, BYSTANDER_USER))
    expect(bystanderTray).toHaveLength(0)
    const bystanderWatch = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, BYSTANDER_USER))
    expect(bystanderWatch).toHaveLength(0)
  })

  it('re-running the fan-out sends nothing twice (spotify_alert_log claims)', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      pushEnabled: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const first = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })
    const second = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(first).toMatchObject({ autoWatched: 1, pushesClaimed: 1 })
    expect(second).toMatchObject({
      matchedPairs: 1,
      autoWatched: 0,
      pushesClaimed: 0,
      failures: 0,
    })
    expect(sendPush).toHaveBeenCalledTimes(1)
    const tray = await db.select().from(notifications)
    expect(tray).toHaveLength(1)
    const ledger = await db.select().from(spotifyAlertLog)
    expect(ledger).toHaveLength(2)
  })

  // Preferences no longer live on the connection, so revoking Spotify leaves
  // them untouched: the user below keeps auto-watch ON.
  it('ignores hidden events, and keeps preferences when the connection is revoked', async () => {
    const venueId = await seedVenue('Fillmore')
    const visibleId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    const hiddenId = await seedEvent({
      venueId,
      artist: 'Hidden Act',
      canonicalArtist: 'hidden act',
      hiddenFromConsumer: true,
    })
    await seedFollower({
      userId: FREE_USER,
      canonicalName: 'hidden act',
      autoWatch: true,
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      status: 'revoked',
    })

    const summary = await runArtistFanout([visibleId, hiddenId], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })

    expect(summary).toMatchObject({
      newEvents: 1,
      // The revoked user still matches; the hidden-event follower does not.
      matchedPairs: 1,
      // The stored preference outlives the revoked connection.
      autoWatched: 1,
      // Alerts default on, but this user has no paid plan.
      pushesClaimed: 0,
    })
  })
})

// A nightly crawl can claim eight pairs for one user inside ninety seconds.
// The claims and the tray rows stay per event; only DELIVERY collapses.
describe('runArtistFanout — push batching (PR 9)', () => {
  it('collapses several new shows into one push, keeping every tray row and claim', async () => {
    const venueId = await seedVenue('Fillmore')
    const first = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    const second = await seedEvent({
      venueId,
      artist: 'Other Act',
      canonicalArtist: 'other act',
      date: '2026-10-14',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      pushEnabled: true,
    })
    await db.insert(userArtistFollows).values({
      userId: PREMIUM_USER,
      artistName: 'Other Act',
      spotifyArtistId: null,
      source: 'manual',
      canonicalName: 'other act',
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([first, second], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({
      newEvents: 2,
      matchedPairs: 2,
      pushesClaimed: 2,
      pushBatchesAttempted: 1,
      failures: 0,
    })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush).toHaveBeenCalledWith({
      userId: PREMIUM_USER,
      category: 'artist.new_show',
      title: '2 artists you follow just booked Denver',
      body: '2 new shows. Want in? Tap to watch.',
      actionUrl: '/following',
      tag: 'artist-new-show-batch',
    })

    // The tray keeps one deep-linked row per show, and the ledger keeps one
    // claim per pair — batching must not weaken exactly-once.
    const tray = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, PREMIUM_USER))
    expect(tray).toHaveLength(2)
    expect(tray.map((row) => row.actionUrl).sort()).toEqual(
      [`/events/${first}`, `/events/${second}`].sort(),
    )
    const ledger = await db.select().from(spotifyAlertLog)
    expect(ledger).toHaveLength(2)
  })

  it('says "dates" rather than "1 artists" when one act books twice', async () => {
    const venueId = await seedVenue('Fillmore')
    const first = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    const second = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
      date: '2026-10-14',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    await runArtistFanout([first, second], { sendPush, getRole: noRole })

    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Big Head Todd: new Denver dates',
        body: '2 new shows, all added to your Watching.',
        actionUrl: '/watching',
      }),
    )
  })

  it('batches per user — two followers get one push each', async () => {
    const venueId = await seedVenue('Fillmore')
    const first = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    const second = await seedEvent({
      venueId,
      artist: 'Other Act',
      canonicalArtist: 'other act',
      date: '2026-10-14',
    })
    for (const userId of [PREMIUM_USER, BYSTANDER_USER]) {
      await seedFollower({ userId, canonicalName: 'big head todd' })
      await db.insert(userArtistFollows).values({
        userId,
        artistName: 'Other Act',
        spotifyArtistId: null,
        source: 'manual',
        canonicalName: 'other act',
      })
      await seedPremiumSubscription(userId)
    }

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([first, second], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ pushesClaimed: 4, pushBatchesAttempted: 2 })
    expect(sendPush).toHaveBeenCalledTimes(2)
    expect(sendPush.mock.calls.map((call) => call[0].userId).sort()).toEqual(
      [BYSTANDER_USER, PREMIUM_USER].sort(),
    )
  })
})

describe('runArtistFanout — failure isolation', () => {
  it('a throwing sendPush is counted and logged, and auto-watch is unaffected', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      autoWatch: true,
      pushEnabled: true,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = vi.fn().mockRejectedValue(new Error('push transport down'))
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ autoWatched: 1, failures: 1 })
    // The auto-watch side effect from the same pair survived the push throw.
    const watch = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, PREMIUM_USER))
    expect(watch).toHaveLength(1)
  })

  it('runArtistFanoutSafely never throws — a run-level failure returns null', async () => {
    // A malformed uuid makes the initial events query itself throw (Postgres
    // uuid parse error) — the run-level failure mode Safely must swallow so
    // a fan-out bug can never fail a crawl.
    const summary = await runArtistFanoutSafely(['not-a-uuid'], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })
    expect(summary).toBeNull()
  })

  it('runArtistFanoutSafely passes through a successful summary', async () => {
    const summary = await runArtistFanoutSafely([], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })
    expect(summary).toMatchObject({ newEvents: 0, matchedPairs: 0 })
  })
})

describe('runArtistFanout — native follows', () => {
  it('notifies a manual follower who has no Spotify connection at all', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedManualFollow({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledTimes(1)
  })

  it('never auto-watches a manual follower — autoWatch defaults off', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedManualFollow({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const summary = await runArtistFanout([eventId], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })

    expect(summary?.autoWatched).toBe(0)
    const watching = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, PREMIUM_USER))
    expect(watching).toHaveLength(0)
  })

  it('still notifies a manual follower whose Spotify connection is revoked', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await db.insert(userSpotifyConnections).values({
      userId: PREMIUM_USER,
      spotifyUserId: `spotify_${PREMIUM_USER}`,
      autoWatch: false,
      pushEnabled: true,
      status: 'revoked',
    })
    await seedManualFollow({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledTimes(1)
  })

  it('sends exactly one push when the same artist is followed both ways', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedFollower({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
      pushEnabled: true,
    })
    await seedManualFollow({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledTimes(1)
  })

  // The whole point of moving the columns: a user who never touched Spotify
  // can still steer both channels.
  it('honours user_notification_preferences for a follower with no connection', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedManualFollow({
      userId: PREMIUM_USER,
      canonicalName: 'big head todd',
    })
    await seedPrefs({
      userId: PREMIUM_USER,
      autoWatch: true,
      pushEnabled: false,
    })
    await seedPremiumSubscription(PREMIUM_USER)

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ autoWatched: 1, pushesClaimed: 0 })
    expect(sendPush).not.toHaveBeenCalled()
    const watching = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, PREMIUM_USER))
    expect(watching).toHaveLength(1)
  })

  it('sends no push to a manual follower on the free plan', async () => {
    const venueId = await seedVenue('Fillmore')
    const eventId = await seedEvent({
      venueId,
      artist: 'Big Head Todd',
      canonicalArtist: 'big head todd',
    })
    await seedManualFollow({
      userId: FREE_USER,
      canonicalName: 'big head todd',
    })

    const sendPush = makeSendPush()
    const summary = await runArtistFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary?.pushesClaimed).toBe(0)
    expect(sendPush).not.toHaveBeenCalled()
  })
})
