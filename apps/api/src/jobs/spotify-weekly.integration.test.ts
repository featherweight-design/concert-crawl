// Integration tests for the weekly Spotify job (#763 PR 4, eng spec §8.1).
// Clerk is stubbed at the SDK boundary and Resend at the module boundary —
// the DB is real (per-worktree test DB), so the email dedupe log and the
// observability row are asserted against actual rows.
//
// fetch is stubbed to throw: the job no longer imports from Spotify, and any
// outbound call would be the resurrection bug coming back. Spotify-sourced
// follows are seeded directly, the way connect and Refresh write them.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { clerkState, resendState } = vi.hoisted(() => ({
  clerkState: {
    // userId → Clerk publicMetadata (drives role-comped plan derivation).
    metadata: new Map<string, Record<string, unknown>>(),
    // userId → primary email address (absent = no recipient).
    emails: new Map<string, string>(),
  },
  resendState: {
    sends: [] as Array<{ to: string; subject: string; html: string }>,
  },
}))

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: async (userId: string) => ({
        publicMetadata: clerkState.metadata.get(userId) ?? {},
        primaryEmailAddressId: 'em_primary',
        emailAddresses: clerkState.emails.has(userId)
          ? [
              {
                id: 'em_primary',
                emailAddress: clerkState.emails.get(userId),
              },
            ]
          : [],
        externalAccounts: [],
      }),
    },
  }),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { to: string; subject: string; html: string }) => {
        resendState.sends.push(payload)
        return { data: { id: `re_${resendState.sends.length}` }, error: null }
      },
    }
  },
}))

import { and, eq, inArray } from 'drizzle-orm'
import {
  costTracking,
  emailSendLog,
  subscriptions,
  userArtistFollows,
  userNotificationPreferences,
  userSpotifyConnections,
} from '@concert-crawl/db'
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'
import { runSpotifyWeekly } from './spotify-weekly.js'

// The job makes no outbound calls at all. Any fetch is a regression, so the
// stub fails the test rather than answering it.
const rejectAllFetch = async (input: RequestInfo | URL): Promise<Response> => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
  throw new Error(`spotify-weekly made an outbound request: ${url}`)
}

// Fixed clock: Monday 2026-07-20 (Denver). ISO week 2026-W30; digest window
// is 2026-07-20 … 2026-07-26 inclusive.
const NOW = new Date('2026-07-20T18:00:00Z')
const ISO_WEEK = '2026-W30'

let userSeq = 0
let USER = 'user-weekly-1'

async function seedConnection(
  userId: string,
  overrides: Partial<typeof userSpotifyConnections.$inferInsert> = {},
): Promise<void> {
  await testDb.insert(userSpotifyConnections).values({
    userId,
    spotifyUserId: `spotify-${userId}`,
    status: 'connected',
    digestEnabled: true,
    ...overrides,
  })
}

async function seedPremium(userId: string): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
  })
}

// Stands in for what connect and Refresh write — the job itself no longer
// creates these rows.
async function seedSpotifyFollow(
  userId: string,
  artists: Array<{ id: string; name: string }>,
): Promise<void> {
  if (artists.length === 0) return
  await testDb.insert(userArtistFollows).values(
    artists.map((artist) => ({
      userId,
      artistName: artist.name,
      canonicalName: canonicalizeArtist(artist.name),
      spotifyArtistId: artist.id,
      source: 'spotify_followed' as const,
    })),
  )
}

async function getDigestLogRows(userId: string) {
  return testDb
    .select()
    .from(emailSendLog)
    .where(
      and(
        eq(emailSendLog.templateKey, 'spotify_digest'),
        eq(emailSendLog.userId, userId),
      ),
    )
}

async function getSpotifyFollows(userId: string) {
  return testDb
    .select()
    .from(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, userId),
        inArray(userArtistFollows.source, ['spotify_followed', 'spotify_top']),
      ),
    )
}

beforeEach(async () => {
  userSeq += 1
  USER = `user-weekly-${userSeq}`
  clerkState.metadata.clear()
  clerkState.emails.clear()
  resendState.sends = []
  await clearTables()
  // Not covered by clearTables' truncate list — clean up per test.
  await testDb.delete(emailSendLog)
  await testDb.delete(subscriptions)
  // The drain-background setup installs a reject-all fetch guard in a
  // beforeAll that runs after this module evaluates; re-stub per test.
  vi.stubGlobal('fetch', rejectAllFetch)
  vi.stubEnv('RESEND_API_KEY', 're_test_key')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_key')
  vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'weekly-job-test-secret')
  vi.stubEnv('SPOTIFY_SYNC_DRY_RUN', '')
  vi.stubEnv('NATIVE_DIGEST_ENABLED', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runSpotifyWeekly — never imports from Spotify', () => {
  it('adds no follows and leaves the connection row untouched', async () => {
    // The unfollow this job used to undo: the artist is gone from our table,
    // and a resurrecting run would put it back within the week.
    await seedConnection(USER)
    await seedPremium(USER)

    await runSpotifyWeekly(NOW)

    expect(await getSpotifyFollows(USER)).toHaveLength(0)
    const [connection] = await testDb
      .select()
      .from(userSpotifyConnections)
      .where(eq(userSpotifyConnections.userId, USER))
    expect(connection?.status).toBe('connected')
    expect(connection?.lastSyncedAt).toBeNull()
  })

  it('does not resurrect a follow the user removed here', async () => {
    await seedConnection(USER)
    await seedSpotifyFollow(USER, [
      { id: 'sp1', name: 'Sleep Token' },
      { id: 'sp2', name: 'Lightning Bug' },
    ])
    // The user unfollows one of them in Concert Crawl while it stays followed
    // on their Spotify account.
    await testDb
      .delete(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, USER),
          eq(userArtistFollows.canonicalName, 'sleep token'),
        ),
      )

    await runSpotifyWeekly(NOW)

    const remaining = await getSpotifyFollows(USER)
    expect(remaining.map((row) => row.canonicalName)).toEqual(['lightning bug'])
  })
})

describe('runSpotifyWeekly — digest phase (§8.1 phase 1)', () => {
  it('skips the digest phase cleanly when CLERK_SECRET_KEY is unset', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'weekly@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    vi.stubEnv('CLERK_SECRET_KEY', '')

    await expect(runSpotifyWeekly(NOW)).resolves.toBeUndefined()

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })

  it('sends a matched-show digest to a premium user, deduped per ISO week', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'weekly@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])

    const venue = await seedVenue({ slug: `venue-${USER}` })
    // In window (2026-07-20 … 2026-07-26) and matching.
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
      ticketPriceMin: '42.00',
    })
    // Matching artist but OUTSIDE the 7-day window — must not count.
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      title: 'Sleep Token later',
      canonicalArtist: 'sleep token',
      date: '2026-07-28',
    })
    // In window but not followed — must not match.
    await seedEvent(venue.id, {
      artist: 'Unrelated Band',
      canonicalArtist: 'unrelated band',
      date: '2026-07-23',
    })

    await runSpotifyWeekly(NOW)

    const rows = await getDigestLogRows(USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.dedupeKey).toBe(`${USER}:${ISO_WEEK}`)
    expect(rows[0]?.status).toBe('sent')

    expect(resendState.sends).toHaveLength(1)
    const send = resendState.sends[0]
    expect(send?.to).toBe('weekly@example.com')
    expect(send?.subject).toBe('1 show this week by artists you follow')
    expect(send?.html).toContain('Sleep Token')
    expect(send?.html).toContain('$42')
    // Signed one-click unsubscribe link in the footer (spec §8.2).
    expect(send?.html).toContain('/v1/email/unsubscribe?uid=')

    // Second run in the same ISO week: dedupe key already consumed, and the
    // retry's summary must not report the deduped no-op as a send.
    await runSpotifyWeekly(NOW)
    expect(await getDigestLogRows(USER)).toHaveLength(1)
    expect(resendState.sends).toHaveLength(1)
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summaries = costs
      .filter((row) => (row.metadata ?? '').includes('"job":"spotify-weekly"'))
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
    expect(summaries).toHaveLength(2)
    expect(summaries[0]?.metadata).toContain('"digestSent":1')
    expect(summaries[1]?.metadata).toContain('"digestSent":0')
  })

  it('ignores manual follows when matching — Spotify sources only (§8.1)', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'weekly@example.com')
    // No Spotify-sourced follows at all — the manual row below is the user's
    // only follow.

    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Manual Fave',
      canonicalArtist: 'manual fave',
      date: '2026-07-22',
    })
    await testDb.insert(userArtistFollows).values({
      userId: USER,
      artistName: 'Manual Fave',
      source: 'manual',
      canonicalName: 'manual fave',
    })

    await runSpotifyWeekly(NOW)

    // The manual follow must not read as a Spotify match — the week is a
    // zero-week (the show may still appear as a taste pick).
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summary = costs.find((row) =>
      (row.metadata ?? '').includes('"job":"spotify-weekly"'),
    )
    expect(summary?.metadata).toContain('"digestZeroWeek":1')
  })

  it('counts a failed send as digestFailures, not digestSent', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'weekly@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })
    // sendTransactionalEmail resolves 'failed' when RESEND_API_KEY is unset.
    vi.stubEnv('RESEND_API_KEY', '')

    await runSpotifyWeekly(NOW)

    expect(resendState.sends).toHaveLength(0)
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summary = costs.find((row) =>
      (row.metadata ?? '').includes('"job":"spotify-weekly"'),
    )
    expect(summary?.metadata).toContain('"digestSent":0')
    expect(summary?.metadata).toContain('"digestFailures":1')
  })

  it('matches via canonical_supporting overlap too (§9.1)', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'support-slot@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp2', name: 'Lightning Bug' }])

    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Wednesday',
      canonicalArtist: 'wednesday',
      canonicalSupporting: ['lightning bug'],
      date: '2026-07-24',
    })

    await runSpotifyWeekly(NOW)

    const rows = await getDigestLogRows(USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('sent')
    expect(resendState.sends[0]?.html).toContain('Wednesday')
  })

  it('matches a derived headliner behind an event-shaped title (§9.1)', async () => {
    // The derivation ladder writes the bill it read out of the title into
    // canonical_headliners, but canonical_artist keeps tracking events.artist,
    // which stays the event's display string. Matching on the equality arm
    // alone would never reach this row.
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'derived-headliner@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp3', name: 'Kokoroko' }])

    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Jazz Series presents',
      canonicalArtist: 'jazz series presents',
      canonicalHeadliners: ['kokoroko'],
      date: '2026-07-24',
    })

    await runSpotifyWeekly(NOW)

    const rows = await getDigestLogRows(USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('sent')
    // The subject, not the body, is what proves the match. A zero-match week
    // still sends — the light variant's taste picks would surface this very
    // event — so asserting on the body alone passes with the headliner arm
    // removed.
    expect(resendState.sends[0]?.subject).toBe(
      '1 show this week by artists you follow',
    )
    expect(resendState.sends[0]?.html).toContain('Jazz Series presents')
  })

  it('skips free users at send time (premium gate)', async () => {
    await seedConnection(USER)
    clerkState.emails.set(USER, 'free@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })

  it('honours role-comped users via Clerk publicMetadata', async () => {
    await seedConnection(USER)
    clerkState.metadata.set(USER, { role: 'admin' })
    clerkState.emails.set(USER, 'comped@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(1)
    expect(resendState.sends).toHaveLength(1)
  })

  it('skips users who turned the digest off', async () => {
    await seedConnection(USER, { digestEnabled: false })
    await seedPremium(USER)
    clerkState.emails.set(USER, 'off@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })

  it('sends the zero-week light variant with up to 2 taste picks', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'quiet@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp9', name: 'Nobody Playing' }])

    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Pick One',
      canonicalArtist: 'pick one',
      date: '2026-07-21',
    })
    await seedEvent(venue.id, {
      artist: 'Pick Two',
      canonicalArtist: 'pick two',
      date: '2026-07-22',
    })
    await seedEvent(venue.id, {
      artist: 'Pick Three',
      canonicalArtist: 'pick three',
      date: '2026-07-23',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(1)
    expect(resendState.sends).toHaveLength(1)
    const send = resendState.sends[0]
    expect(send?.subject).toBe(
      'A quiet week for your artists: two picks anyway',
    )
    // Two picks max, ordered by date.
    expect(send?.html).toContain('Pick One')
    expect(send?.html).toContain('Pick Two')
    expect(send?.html).not.toContain('Pick Three')
  })

  it('skips the send entirely on a zero-match week with no taste picks', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'empty@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp9', name: 'Nobody Playing' }])
    // No events at all in the window.

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })
})

// PR 9 step 3. Both halves of the digest were Spotify-shaped: the recipient
// query inner-joined user_spotify_connections for digestEnabled, and the
// match query filtered follows to the two spotify_* sources. Fixing either
// alone drops every native follower while still reporting success (#1515).
describe('runSpotifyWeekly — generalized digest (NATIVE_DIGEST_ENABLED)', () => {
  const seedFollow = async (userId: string, name: string): Promise<void> => {
    await testDb.insert(userArtistFollows).values({
      userId,
      artistName: name,
      source: 'manual',
      canonicalName: canonicalizeArtist(name),
    })
  }

  it('sends nothing to a native-only follower while the flag is off', async () => {
    await seedPremium(USER)
    clerkState.emails.set(USER, 'native@example.com')
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })
    await seedFollow(USER, 'Sleep Token')

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })

  it('sends to a follower with no Spotify connection at all', async () => {
    vi.stubEnv('NATIVE_DIGEST_ENABLED', '1')
    await seedPremium(USER)
    clerkState.emails.set(USER, 'native@example.com')
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
      ticketPriceMin: '42.00',
    })
    await seedFollow(USER, 'Sleep Token')

    await runSpotifyWeekly(NOW)

    // No user_spotify_connections row exists for this user at any point.
    expect(
      await testDb
        .select()
        .from(userSpotifyConnections)
        .where(eq(userSpotifyConnections.userId, USER)),
    ).toHaveLength(0)
    const rows = await getDigestLogRows(USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('sent')
    expect(resendState.sends[0]?.html).toContain('Sleep Token')
  })

  it('reaches a follower who never opened Settings (no preferences row)', async () => {
    vi.stubEnv('NATIVE_DIGEST_ENABLED', '1')
    await seedPremium(USER)
    clerkState.emails.set(USER, 'lazy-row@example.com')
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })
    await seedFollow(USER, 'Sleep Token')

    await runSpotifyWeekly(NOW)

    expect(
      await testDb
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, USER)),
    ).toHaveLength(0)
    expect(await getDigestLogRows(USER)).toHaveLength(1)
  })

  it('honours weekly_digest_enabled=false from the preferences table', async () => {
    vi.stubEnv('NATIVE_DIGEST_ENABLED', '1')
    await seedPremium(USER)
    clerkState.emails.set(USER, 'opted-out@example.com')
    // The legacy column stays true: a regression back to reading the
    // connection would send this email anyway.
    await seedConnection(USER, { digestEnabled: true })
    await testDb.insert(userNotificationPreferences).values({
      userId: USER,
      weeklyDigestEnabled: false,
    })
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })
    await seedFollow(USER, 'Sleep Token')

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })

  it('gates on the following entitlement, not spotify-sync', async () => {
    vi.stubEnv('NATIVE_DIGEST_ENABLED', '1')
    clerkState.emails.set(USER, 'free-native@example.com')
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })
    await seedFollow(USER, 'Sleep Token')

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summary = costs.find((row) =>
      (row.metadata ?? '').includes('"job":"spotify-weekly"'),
    )
    expect(summary?.metadata).toContain('"digestSkippedEntitlement":1')
    expect(summary?.metadata).toContain('"nativeDigest":true')
  })

  it('still sends to a Spotify follower once generalized', async () => {
    vi.stubEnv('NATIVE_DIGEST_ENABLED', '1')
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'both@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(1)
    expect(resendState.sends).toHaveLength(1)
  })
})

describe('runSpotifyWeekly — dry run + observability (§8.1 phase 2)', () => {
  it('SPOTIFY_SYNC_DRY_RUN=1 sends no emails but still records the summary row', async () => {
    vi.stubEnv('SPOTIFY_SYNC_DRY_RUN', '1')
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'dry@example.com')
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)

    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summaries = costs.filter((row) =>
      (row.metadata ?? '').includes('"job":"spotify-weekly"'),
    )
    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.metadata).toContain('"dryRun":true')
  })

  it('writes exactly one zero-dollar summary row per run', async () => {
    await seedConnection(USER)
    await seedSpotifyFollow(USER, [{ id: 'sp1', name: 'Sleep Token' }])

    await runSpotifyWeekly(NOW)

    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    const summaries = costs.filter((row) =>
      (row.metadata ?? '').includes('"job":"spotify-weekly"'),
    )
    expect(summaries).toHaveLength(1)
    expect(Number(summaries[0]?.costUsd)).toBe(0)
    expect(summaries[0]?.metadata).toContain(`"isoWeek":"${ISO_WEEK}"`)
  })
})
