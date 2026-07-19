// Integration tests for the `followedArtists` overlay on the events list +
// detail endpoints (#763 PR 6, eng spec §9.2). Signed-in users with
// Spotify-sourced follow rows get, per event, the display names of their
// artists that match the event's canonical headliner/supporting set.
// Anonymous requests and users with no Spotify follows get NO field at all —
// and, critically, no extra query.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { userArtistFollows, userSpotifyConnections } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

const USER = 'user_following_1'

// Far-future date so the list endpoint's `date >= today` filter always passes.
const FUTURE_DATE = '2030-06-01'

const signIn = (userId: string = USER) => {
  authState.current = { userId, sessionClaims: {} }
}

const seedFollow = async (
  artistName: string,
  source: 'spotify_followed' | 'spotify_top' | 'manual' = 'spotify_followed',
  userId: string = USER,
) => {
  await testDb.insert(userArtistFollows).values({
    userId,
    artistName,
    canonicalName: artistName.toLowerCase().trim(),
    source,
  })
}

const seedConnection = async (
  overrides: Partial<typeof userSpotifyConnections.$inferInsert> = {},
) => {
  await testDb.insert(userSpotifyConnections).values({
    userId: USER,
    spotifyUserId: 'spotify-user-1',
    status: 'connected',
    ...overrides,
  })
}

interface ListEventPayload {
  id: string
  followedArtists?: string[]
}

const fetchList = async (): Promise<ListEventPayload[]> => {
  const res = await app.request('/v1/events')
  expect(res.status).toBe(200)
  const body = await res.json()
  return body.data.data
}

const fetchDetail = async (
  id: string,
): Promise<{ status: number; data: Record<string, unknown> }> => {
  const res = await app.request(`/v1/events/${id}`)
  const body = await res.json()
  return { status: res.status, data: body.data }
}

describe('followedArtists overlay (#763 PR 6)', () => {
  beforeEach(async () => {
    await clearTables()
    authState.current = null
  })

  it('anonymous list requests carry no followedArtists field', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })

    const rows = await fetchList()
    expect(rows).toHaveLength(1)
    expect(rows[0]).not.toHaveProperty('followedArtists')
  })

  it('signed-in users without any Spotify follows get no field', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    signIn()

    const rows = await fetchList()
    expect(rows[0]).not.toHaveProperty('followedArtists')
  })

  it('manual follow rows alone do not activate the overlay', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedFollow('Phoebe Bridgers', 'manual')
    signIn()

    const rows = await fetchList()
    expect(rows[0]).not.toHaveProperty('followedArtists')
  })

  it('connected user sees display names on headliner matches, empty array elsewhere', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    const noMatch = await seedEvent(venue.id, {
      artist: 'Some Other Band',
      date: FUTURE_DATE,
    })
    await seedConnection()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const rows = await fetchList()
    const matchRow = rows.find((row) => row.id === match.id)
    const noMatchRow = rows.find((row) => row.id === noMatch.id)
    expect(matchRow?.followedArtists).toEqual(['Phoebe Bridgers'])
    expect(noMatchRow?.followedArtists).toEqual([])
  })

  it('matches supporting artists via canonical_supporting overlap', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Headliner Act',
      supportingArtists: ['MJ Lenderman', 'Hotline TNT'],
      canonicalSupporting: ['mj lenderman', 'hotline tnt'],
      date: FUTURE_DATE,
    })
    await seedConnection()
    await seedFollow('MJ Lenderman', 'spotify_top')
    signIn()

    const rows = await fetchList()
    const row = rows.find((item) => item.id === event.id)
    expect(row?.followedArtists).toEqual(['MJ Lenderman'])
  })

  it('sorts multiple matched names and combines headliner + supporting', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Wednesday',
      supportingArtists: ['MJ Lenderman'],
      canonicalSupporting: ['mj lenderman'],
      date: FUTURE_DATE,
    })
    await seedConnection()
    await seedFollow('Wednesday')
    await seedFollow('MJ Lenderman')
    signIn()

    const rows = await fetchList()
    const row = rows.find((item) => item.id === event.id)
    expect(row?.followedArtists).toEqual(['MJ Lenderman', 'Wednesday'])
  })

  it('does not leak canonical columns into the list payload', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedConnection()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const rows = await fetchList()
    expect(rows[0]).not.toHaveProperty('canonicalArtist')
    expect(rows[0]).not.toHaveProperty('canonicalSupporting')
  })

  it('detail response includes followedArtists for a connected user', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedConnection()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { status, data } = await fetchDetail(event.id)
    expect(status).toBe(200)
    expect(data['followedArtists']).toEqual(['Phoebe Bridgers'])
    expect(data).not.toHaveProperty('canonicalArtist')
    expect(data).not.toHaveProperty('canonicalSupporting')
  })

  it('detail response omits the field for anonymous users', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })

    const { status, data } = await fetchDetail(event.id)
    expect(status).toBe(200)
    expect(data).not.toHaveProperty('followedArtists')
  })

  it('error-status connections keep highlighting (rows retained per §8.4)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedConnection({ status: 'error', lastSyncError: 'token_refresh' })
    await seedFollow('Phoebe Bridgers')
    signIn()

    const rows = await fetchList()
    const row = rows.find((item) => item.id === event.id)
    expect(row?.followedArtists).toEqual(['Phoebe Bridgers'])
  })

  it('revoked connections (follow rows purged) surface no field', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    // Revocation purges Spotify-sourced rows — only the connection row (in
    // revoked state) remains. No follow rows ⇒ overlay never activates.
    await seedConnection({ status: 'revoked' })
    signIn()

    const rows = await fetchList()
    expect(rows[0]).not.toHaveProperty('followedArtists')
  })
})
