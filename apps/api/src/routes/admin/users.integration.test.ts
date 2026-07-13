import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState, clerkState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
  clerkState: {
    getUserThrows: false,
    getUserErrorStatus: 404 as number,
    user: {
      id: 'user_target',
      username: 'targetuser' as string | null,
      primaryEmailAddressId: 'email_primary' as string | null,
      emailAddresses: [
        { id: 'email_primary', emailAddress: 'target@example.com' },
      ] as Array<{ id: string; emailAddress: string }>,
      publicMetadata: {} as { role?: string; handle?: string },
      createdAt: new Date('2026-04-01T00:00:00Z').getTime(),
    },
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: vi.fn().mockImplementation(() => {
        if (clerkState.getUserThrows) {
          return Promise.reject(
            Object.assign(new Error('Clerk lookup failed'), {
              status: clerkState.getUserErrorStatus,
            }),
          )
        }
        return Promise.resolve(clerkState.user)
      }),
    },
  }),
}))

import { sql } from 'drizzle-orm'
import { feedback, userArtistFollows } from '@concert-crawl/db'
import { createApp } from '../../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
  seedPriceSubmission,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'

const app = createApp()

const TARGET_USER = 'user_target'

function setAuth(role = 'admin', userId = 'admin_123'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

function clearAuth(): void {
  authState.current = null
}

function resetClerk(): void {
  clerkState.getUserThrows = false
  clerkState.getUserErrorStatus = 404
  clerkState.user = {
    id: TARGET_USER,
    username: 'targetuser',
    primaryEmailAddressId: 'email_primary',
    emailAddresses: [
      { id: 'email_primary', emailAddress: 'target@example.com' },
    ],
    publicMetadata: {},
    createdAt: new Date('2026-04-01T00:00:00Z').getTime(),
  }
}

async function getDetail(userId = TARGET_USER): Promise<Response> {
  return app.request(`/v1/admin/users/${userId}`, {
    headers: { Authorization: 'Bearer test' },
  })
}

describe('GET /v1/admin/users/:userId', () => {
  beforeEach(async () => {
    clearAuth()
    resetClerk()
    await clearTables()
    await testDb.execute(sql`TRUNCATE user_artist_follows RESTART IDENTITY`)
  })

  it('returns 401 without auth', async () => {
    const res = await getDetail()
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    setAuth('user')
    const res = await getDetail()
    expect(res.status).toBe(403)
  })

  it('returns 404 when the id maps to no Clerk record and no activity', async () => {
    setAuth('admin')
    clerkState.getUserThrows = true
    const res = await getDetail('user_ghost')
    expect(res.status).toBe(404)
  })

  it('surfaces a 500, not a false "deleted account", on a transient Clerk error', async () => {
    setAuth('admin')
    clerkState.getUserThrows = true
    clerkState.getUserErrorStatus = 503
    // DB activity exists, so the old blanket catch would have returned a 200
    // with clerkAccountMissing:true — masking the outage as a deleted account.
    await seedUserProfile(TARGET_USER, { handle: 'flaky' })
    await testDb.insert(feedback).values({
      userId: TARGET_USER,
      pageUrl: 'https://concertcrawl.app/events',
      category: 'bug',
      message: 'Present',
      status: 'unread',
    })

    const res = await getDetail()
    expect(res.status).toBe(500)
  })

  it('returns the full detail shape for a user with activity', async () => {
    setAuth('admin')
    clerkState.user.publicMetadata = { role: 'beta' }
    await seedUserProfile(TARGET_USER, {
      handle: 'targethandle',
      city: 'Denver',
      theme: 'jade',
      avatarColor: 'signal',
    })
    const venue = await seedVenue({ name: 'Ogden Theatre' })
    const event = await seedEvent(venue.id, { title: 'Night One' })
    await seedUserEvent(TARGET_USER, event.id, { status: 'going' })
    await seedPriceSubmission(event.id, TARGET_USER)
    await testDb.insert(feedback).values({
      userId: TARGET_USER,
      pageUrl: 'https://concertcrawl.app/events',
      category: 'bug',
      message: 'Something broke',
      status: 'unread',
    })
    await testDb.insert(userArtistFollows).values({
      userId: TARGET_USER,
      artistName: 'Phoebe Bridgers',
    })

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        id: string
        email: string | null
        handle: string | null
        city: string | null
        theme: string | null
        avatarColor: string | null
        role: string | null
        joinedAt: string | null
        clerkAccountMissing: boolean
        stats: {
          feedback: number
          trackedEvents: number
          priceSubmissions: number
          artistFollows: number
        }
        feedback: Array<{ message: string; category: string }>
        trackedEvents: Array<{ eventTitle: string; venueName: string | null }>
      }
    }

    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TARGET_USER)
    expect(body.data.email).toBe('target@example.com')
    // Profile handle wins over the Clerk username fallback.
    expect(body.data.handle).toBe('targethandle')
    expect(body.data.city).toBe('Denver')
    expect(body.data.theme).toBe('jade')
    expect(body.data.avatarColor).toBe('signal')
    expect(body.data.role).toBe('beta')
    expect(body.data.joinedAt).toBe('2026-04-01T00:00:00.000Z')
    expect(body.data.stats).toEqual({
      feedback: 1,
      trackedEvents: 1,
      priceSubmissions: 1,
      artistFollows: 1,
    })
    expect(body.data.clerkAccountMissing).toBe(false)
    expect(body.data.feedback[0]?.message).toBe('Something broke')
    expect(body.data.trackedEvents[0]?.eventTitle).toBe('Night One')
    expect(body.data.trackedEvents[0]?.venueName).toBe('Ogden Theatre')
  })

  it('tolerates a deleted Clerk account when DB activity remains', async () => {
    setAuth('admin')
    clerkState.getUserThrows = true
    await seedUserProfile(TARGET_USER, { handle: 'orphan' })
    await testDb.insert(feedback).values({
      userId: TARGET_USER,
      pageUrl: 'https://concertcrawl.app/events',
      category: 'praise',
      message: 'Love it',
      status: 'unread',
    })

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        email: string | null
        role: string | null
        handle: string | null
        joinedAt: string | null
        clerkAccountMissing: boolean
      }
    }
    expect(body.success).toBe(true)
    // No Clerk record ⇒ identity fields fall back to profile / null.
    expect(body.data.email).toBeNull()
    expect(body.data.role).toBeNull()
    expect(body.data.handle).toBe('orphan')
    expect(body.data.joinedAt).toBeNull()
    expect(body.data.clerkAccountMissing).toBe(true)
  })

  it('defaults a live Clerk user with no explicit role to user', async () => {
    setAuth('admin')
    clerkState.user.publicMetadata = {}
    await seedUserProfile(TARGET_USER, { handle: 'roleless' })

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { role: string | null; clerkAccountMissing: boolean }
    }
    expect(body.success).toBe(true)
    expect(body.data.role).toBe('user')
    expect(body.data.clerkAccountMissing).toBe(false)
  })

  it('surfaces the primary email, not the first address', async () => {
    setAuth('admin')
    clerkState.user.primaryEmailAddressId = 'email_primary'
    clerkState.user.emailAddresses = [
      { id: 'email_secondary', emailAddress: 'secondary@example.com' },
      { id: 'email_primary', emailAddress: 'primary@example.com' },
    ]
    await seedUserProfile(TARGET_USER, { handle: 'multi' })

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { email: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.email).toBe('primary@example.com')
  })

  it('returns 200, not 404, when only price/artist activity exists', async () => {
    setAuth('admin')
    clerkState.getUserThrows = true
    const venue = await seedVenue({ name: 'Bluebird' })
    const event = await seedEvent(venue.id, { title: 'Solo Show' })
    await seedPriceSubmission(event.id, TARGET_USER)
    await testDb.insert(userArtistFollows).values({
      userId: TARGET_USER,
      artistName: 'Big Thief',
    })

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        stats: { priceSubmissions: number; artistFollows: number }
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.stats.priceSubmissions).toBe(1)
    expect(body.data.stats.artistFollows).toBe(1)
  })

  it('counts total feedback beyond the 100-row list cap', async () => {
    setAuth('admin')
    await seedUserProfile(TARGET_USER, { handle: 'prolific' })
    const rows = Array.from({ length: 105 }, (_unused, idx) => ({
      userId: TARGET_USER,
      pageUrl: 'https://concertcrawl.app/events',
      category: 'bug' as const,
      message: `Report ${idx}`,
      status: 'unread' as const,
    }))
    await testDb.insert(feedback).values(rows)

    const res = await getDetail()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        stats: { feedback: number }
        feedback: Array<{ message: string }>
      }
    }
    expect(body.success).toBe(true)
    // Stat card reflects the true total…
    expect(body.data.stats.feedback).toBe(105)
    // …while the list stays capped at the display limit.
    expect(body.data.feedback.length).toBe(100)
  })
})
