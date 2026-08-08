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
  userSpotifyConnections,
  venues,
} from '@concert-crawl/db'
import { runSpotifyFanout, runSpotifyFanoutSafely } from './index.js'

// Real-Postgres coverage for the #763 §10.1 fan-out: the exactly-once
// spotify_alert_log claims, the free/premium channel gating, and the §9.1
// canonical matching all depend on real unique indexes + array overlap —
// none of which the in-memory mock models.

const FREE_USER = 'user_fanout_free'
const PREMIUM_USER = 'user_fanout_premium'

async function clearFanoutState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, notifications, spotify_alert_log, user_events, user_artist_follows, user_spotify_connections, subscriptions, gifted_comps, user_billing RESTART IDENTITY CASCADE`,
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

async function seedFollower(input: SeedFollowerInput): Promise<void> {
  await db.insert(userSpotifyConnections).values({
    userId: input.userId,
    spotifyUserId: `spotify_${input.userId}`,
    autoWatch: input.autoWatch ?? false,
    pushEnabled: input.pushEnabled ?? true,
    status: input.status ?? 'connected',
  })
  await db.insert(userArtistFollows).values({
    userId: input.userId,
    artistName: input.canonicalName,
    spotifyArtistId: `artist_${crypto.randomUUID()}`,
    source: 'spotify_followed',
    canonicalName: input.canonicalName,
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

describe('runSpotifyFanout — channel gating (#763 §10.1)', () => {
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
    const summary = await runSpotifyFanout([eventId], {
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
      category: 'spotify.new_show',
      title: 'Big Head Todd: new Denver date',
      body: 'Fillmore · Oct 12. Want in? Tap to watch.',
      actionUrl: `/events/${eventId}`,
      tag: `spotify-new-show-${eventId}`,
    })
    const premiumTray = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, PREMIUM_USER))
    expect(premiumTray).toHaveLength(1)
    expect(premiumTray[0]).toMatchObject({
      type: 'user_notification',
      category: 'spotify.new_show',
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
    const summary = await runSpotifyFanout([eventId], {
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
    const summary = await runSpotifyFanout([eventId], {
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

    const summary = await runSpotifyFanout([eventId], {
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

describe('runSpotifyFanout — matching + idempotency', () => {
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

    const summary = await runSpotifyFanout([eventId], {
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
    const first = await runSpotifyFanout([eventId], {
      sendPush,
      getRole: noRole,
    })
    const second = await runSpotifyFanout([eventId], {
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

  // A revoked connection no longer removes the follower — it removes their
  // stored preferences, so the defaults apply. The user below has autoWatch
  // ON, and must still not be auto-watched.
  it('ignores hidden events, and falls back to defaults on a revoked connection', async () => {
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

    const summary = await runSpotifyFanout([visibleId, hiddenId], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })

    expect(summary).toMatchObject({
      newEvents: 1,
      // The revoked user still matches; the hidden-event follower does not.
      matchedPairs: 1,
      // autoWatch:true came off the revoked connection, so it is discarded.
      autoWatched: 0,
      // pushEnabled defaults true, but this user has no paid plan.
      pushesClaimed: 0,
    })
  })
})

describe('runSpotifyFanout — failure isolation', () => {
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
    const summary = await runSpotifyFanout([eventId], {
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

  it('runSpotifyFanoutSafely never throws — a run-level failure returns null', async () => {
    // A malformed uuid makes the initial events query itself throw (Postgres
    // uuid parse error) — the run-level failure mode Safely must swallow so
    // a fan-out bug can never fail a crawl.
    const summary = await runSpotifyFanoutSafely(['not-a-uuid'], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })
    expect(summary).toBeNull()
  })

  it('runSpotifyFanoutSafely passes through a successful summary', async () => {
    const summary = await runSpotifyFanoutSafely([], {
      sendPush: makeSendPush(),
      getRole: noRole,
    })
    expect(summary).toMatchObject({ newEvents: 0, matchedPairs: 0 })
  })
})

describe('runSpotifyFanout — native follows', () => {
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
    const summary = await runSpotifyFanout([eventId], {
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

    const summary = await runSpotifyFanout([eventId], {
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
    const summary = await runSpotifyFanout([eventId], {
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
    const summary = await runSpotifyFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary).toMatchObject({ matchedPairs: 1, pushesClaimed: 1 })
    expect(sendPush).toHaveBeenCalledTimes(1)
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
    const summary = await runSpotifyFanout([eventId], {
      sendPush,
      getRole: noRole,
    })

    expect(summary?.pushesClaimed).toBe(0)
    expect(sendPush).not.toHaveBeenCalled()
  })
})
