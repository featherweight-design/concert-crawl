// Integration tests for the weekly Spotify job (#763 PR 4, eng spec §8.1).
// Spotify is stubbed at the fetch boundary, Clerk at the SDK boundary, and
// Resend at the module boundary — the DB is real (per-worktree test DB), so
// the sync replace-set writes, the email dedupe log, and the observability
// row are all asserted against actual rows.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { clerkState, resendState } = vi.hoisted(() => ({
  clerkState: {
    // userId → Spotify OAuth token (absent = no grant → revoke path).
    tokens: new Map<string, string>(),
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
      getUserOauthAccessToken: async (userId: string) => ({
        data: clerkState.tokens.has(userId)
          ? [{ token: clerkState.tokens.get(userId) }]
          : [],
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
  userSpotifyConnections,
} from '@concert-crawl/db'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'
import { runSpotifyWeekly } from './spotify-weekly.js'

// --- Spotify HTTP stub (fetch boundary), same shape as
// spotify.integration.test.ts ---

interface SpotifyStubArtist {
  id: string
  name: string
}

const spotifyState = {
  followed: [] as SpotifyStubArtist[],
  top: [] as SpotifyStubArtist[],
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const spotifyFetchStub = async (
  input: RequestInfo | URL,
): Promise<Response> => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
  if (!url.startsWith('https://api.spotify.com/')) {
    throw new Error(`unexpected non-Spotify fetch in test: ${url}`)
  }
  if (url.includes('/me/following')) {
    return jsonResponse({
      artists: { items: spotifyState.followed, cursors: { after: null } },
    })
  }
  if (url.includes('/me/top/artists')) {
    return jsonResponse({ items: spotifyState.top })
  }
  return jsonResponse({ id: 'spotify-user', display_name: 'Test' })
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

function grantSpotify(userId: string, artists: SpotifyStubArtist[]): void {
  clerkState.tokens.set(userId, 'spotify-access-token')
  spotifyState.followed = artists
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
  clerkState.tokens.clear()
  clerkState.metadata.clear()
  clerkState.emails.clear()
  resendState.sends = []
  spotifyState.followed = []
  spotifyState.top = []
  await clearTables()
  // Not covered by clearTables' truncate list — clean up per test.
  await testDb.delete(emailSendLog)
  await testDb.delete(subscriptions)
  // The drain-background setup installs a reject-all fetch guard in a
  // beforeAll that runs after this module evaluates; re-stub per test.
  vi.stubGlobal('fetch', spotifyFetchStub)
  vi.stubEnv('RESEND_API_KEY', 're_test_key')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_key')
  vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'weekly-job-test-secret')
  vi.stubEnv('SPOTIFY_SYNC_DRY_RUN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runSpotifyWeekly — sync phase (§8.1 phase 1)', () => {
  it('syncs every non-revoked connection and skips revoked ones', async () => {
    const revokedUser = `${USER}-revoked`
    await seedConnection(USER)
    await seedConnection(revokedUser, { status: 'revoked' })
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])

    await runSpotifyWeekly(NOW)

    const follows = await getSpotifyFollows(USER)
    expect(follows).toHaveLength(1)
    expect(follows[0]?.canonicalName).toBe('sleep token')
    const [connection] = await testDb
      .select()
      .from(userSpotifyConnections)
      .where(eq(userSpotifyConnections.userId, USER))
    expect(connection?.status).toBe('connected')
    expect(connection?.artistCount).toBe(1)
    expect(connection?.lastSyncedAt).not.toBeNull()

    // Revoked user is never synced — no token fetch means no revoke rewrite,
    // and no follow rows appear.
    expect(await getSpotifyFollows(revokedUser)).toHaveLength(0)
  })
})

describe('runSpotifyWeekly — digest phase (§8.1 phase 2)', () => {
  it('sends a matched-show digest to a premium user, deduped per ISO week', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'weekly@example.com')
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])

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

    // Second run in the same ISO week: dedupe key already consumed.
    await runSpotifyWeekly(NOW)
    expect(await getDigestLogRows(USER)).toHaveLength(1)
    expect(resendState.sends).toHaveLength(1)
  })

  it('matches via canonical_supporting overlap too (§9.1)', async () => {
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'support-slot@example.com')
    grantSpotify(USER, [{ id: 'sp2', name: 'Lightning Bug' }])

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

  it('skips free users at send time (premium gate)', async () => {
    await seedConnection(USER)
    clerkState.emails.set(USER, 'free@example.com')
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])
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
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])
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
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])
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
    grantSpotify(USER, [{ id: 'sp9', name: 'Nobody Playing' }])

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
      'A quiet week for your artists — two picks anyway',
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
    grantSpotify(USER, [{ id: 'sp9', name: 'Nobody Playing' }])
    // No events at all in the window.

    await runSpotifyWeekly(NOW)

    expect(await getDigestLogRows(USER)).toHaveLength(0)
    expect(resendState.sends).toHaveLength(0)
  })
})

describe('runSpotifyWeekly — dry run + observability (§8.1 phase 3)', () => {
  it('SPOTIFY_SYNC_DRY_RUN=1 writes no artist rows and sends no emails, but still records the summary row', async () => {
    vi.stubEnv('SPOTIFY_SYNC_DRY_RUN', '1')
    await seedConnection(USER)
    await seedPremium(USER)
    clerkState.emails.set(USER, 'dry@example.com')
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])
    const venue = await seedVenue({ slug: `venue-${USER}` })
    await seedEvent(venue.id, {
      artist: 'Sleep Token',
      canonicalArtist: 'sleep token',
      date: '2026-07-22',
    })

    await runSpotifyWeekly(NOW)

    expect(await getSpotifyFollows(USER)).toHaveLength(0)
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
    grantSpotify(USER, [{ id: 'sp1', name: 'Sleep Token' }])

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
