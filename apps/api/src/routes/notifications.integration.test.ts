import { describe, it, expect, beforeEach, vi } from 'vitest'

interface MockAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { userProfiles } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedNotification,
  seedUserProfile,
} from '../test/helpers/seed.js'
import {
  NOTIFICATION_BACKFILL_DAYS,
  NOTIFICATION_PAGE_SIZE,
} from '../lib/definitions/notification-windows.js'

const app = createApp()

const DAY_MS = 24 * 60 * 60 * 1000

// Fixtures copied verbatim from the shipped writers — the panel renders these
// strings, so the tests pin the real ones rather than the prototype's mocks:
//   packages/push/src/definitions/copy.ts            (watch.*)
//   apps/api/src/lib/contest-notifications.ts        (contest.*)
//   packages/crawler-core/.../spotify-fanout/copy.ts (spotify.new_show)
const PRICE_DROP = {
  category: 'watch.pricedrop',
  title: '$28 tickets for Geese at Bluebird Theater just went on sale.',
  body: "Down from $41. Cheapest we've seen for this one.",
}
const CONTEST_RESOLVED = {
  category: 'contest.resolved',
  title: 'Your price submission was reviewed.',
  body: 'Fees were already included in the listed price.',
}
const SPOTIFY_NEW_SHOW = {
  category: 'spotify.new_show',
  title: 'Big Head Todd — new Denver date',
  body: 'Fillmore · Oct 12. Added to your Watching.',
}

// Response bodies cross a boundary (JSON over `app.request`), so they are
// parsed rather than cast — a shape drift in the route should fail the test
// that asserts the shape, not silently satisfy the compiler.
const listBodySchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        title: z.string(),
        body: z.string(),
        actionUrl: z.string().nullable(),
        readAt: z.string().nullable(),
        createdAt: z.string(),
        metadata: z.record(z.unknown()).nullable(),
      }),
    ),
    unreadCount: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    seenAt: z.string().nullable(),
  }),
})

const errorBodySchema = z.object({
  success: z.boolean(),
  error: z.string(),
})

const updatedBodySchema = z.object({
  success: z.boolean(),
  data: z.object({ updated: z.number() }),
})

const parseBody = async <TSchema extends z.ZodTypeAny>(
  res: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> => {
  const raw: unknown = await res.json()
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `unexpected response shape: ${JSON.stringify(parsed.error.issues)}`,
    )
  }
  return parsed.data
}

function setAuth(userId = 'user_notif_test'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

const seedUserNotification = async (
  userId: string,
  overrides: Parameters<typeof seedNotification>[0] = {},
) =>
  seedNotification({
    userId,
    type: 'user_notification',
    ...PRICE_DROP,
    ...overrides,
  })

const getList = async (query = '') => {
  const res = await app.request(`/v1/notifications${query}`)
  expect(res.status).toBe(200)
  return parseBody(res, listBodySchema)
}

/** Walks the whole list one row at a time, exactly as a paging client would. */
const pageAll = async (maxPages: number): Promise<string[]> => {
  const seen: string[] = []
  let cursor: string | null = null
  for (let page = 0; page < maxPages; page += 1) {
    const body = await getList(
      cursor === null
        ? '?limit=1'
        : `?limit=1&cursor=${encodeURIComponent(cursor)}`,
    )
    const item = body.data.items[0]
    if (item === undefined) break
    seen.push(item.title)
    cursor = body.data.nextCursor
    if (cursor === null) break
  }
  return seen
}

describe('GET /v1/notifications', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/notifications')
    expect(res.status).toBe(401)
    const body = await parseBody(res, errorBodySchema)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns an empty list for a user with no notifications', async () => {
    setAuth()
    const body = await getList()
    expect(body.success).toBe(true)
    expect(body.data.items).toHaveLength(0)
    expect(body.data.unreadCount).toBe(0)
    expect(body.data.hasMore).toBe(false)
    expect(body.data.seenAt).toBeNull()
  })

  it('returns only the calling user rows', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner')
    await seedUserNotification('user_other')
    const body = await getList()
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0]?.title).toBe(PRICE_DROP.title)
  })

  it('excludes admin_alert rows', async () => {
    setAuth('user_owner')
    await seedNotification({ userId: 'user_owner', type: 'admin_alert' })
    await seedUserNotification('user_owner', SPOTIFY_NEW_SHOW)
    const body = await getList()
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0]?.category).toBe('spotify.new_show')
  })

  it('excludes rows older than the backfill window', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', {
      createdAt: new Date(
        Date.now() - (NOTIFICATION_BACKFILL_DAYS + 1) * DAY_MS,
      ),
    })
    await seedUserNotification('user_owner', {
      ...CONTEST_RESOLVED,
      createdAt: new Date(Date.now() - DAY_MS),
    })
    const body = await getList()
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0]?.category).toBe('contest.resolved')
  })

  it('orders items by createdAt descending', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', {
      title: 'oldest',
      createdAt: new Date(Date.now() - 3 * DAY_MS),
    })
    await seedUserNotification('user_owner', {
      title: 'newest',
      createdAt: new Date(Date.now() - 1 * DAY_MS),
    })
    await seedUserNotification('user_owner', {
      title: 'middle',
      createdAt: new Date(Date.now() - 2 * DAY_MS),
    })
    const body = await getList()
    expect(body.data.items.map((item) => item.title)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })

  it('sets hasMore when a row beyond the page size exists', async () => {
    setAuth('user_owner')
    for (let i = 0; i < NOTIFICATION_PAGE_SIZE + 1; i += 1) {
      await seedUserNotification('user_owner', {
        title: `row ${i}`,
        createdAt: new Date(Date.now() - i * 60_000),
      })
    }
    const body = await getList()
    expect(body.data.items).toHaveLength(NOTIFICATION_PAGE_SIZE)
    expect(body.data.hasMore).toBe(true)
  })

  it('pages backwards with `nextCursor`', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', {
      title: 'newer',
      createdAt: new Date(Date.now() - 60_000),
    })
    await seedUserNotification('user_owner', {
      title: 'older',
      createdAt: new Date(Date.now() - 120_000),
    })
    const first = await getList('?limit=1')
    expect(first.data.items[0]?.title).toBe('newer')
    expect(first.data.hasMore).toBe(true)
    expect(first.data.nextCursor).not.toBeNull()
    const second = await getList(
      `?limit=1&cursor=${encodeURIComponent(first.data.nextCursor ?? '')}`,
    )
    expect(second.data.items).toHaveLength(1)
    expect(second.data.items[0]?.title).toBe('older')
    expect(second.data.hasMore).toBe(false)
    expect(second.data.nextCursor).toBeNull()
  })

  // A single fan-out transaction stamps every row it writes with the same
  // `now()`, so three tied timestamps is the realistic case, not a contrived
  // one. Paging on the timestamp alone drops every tied row after the first.
  it('pages through createdAt ties without skipping a row', async () => {
    setAuth('user_owner')
    const tied = new Date(Date.now() - 60_000)
    for (const title of ['tie a', 'tie b', 'tie c']) {
      await seedUserNotification('user_owner', { title, createdAt: tied })
    }

    const seen = await pageAll(3)
    expect(seen).toHaveLength(3)
    expect([...seen].sort()).toEqual(['tie a', 'tie b', 'tie c'])
  })

  // `timestamptz` holds microseconds; a JS `Date` holds milliseconds. A cursor
  // round-tripped through `Date` truncates, and every row inside the truncated
  // microsecond then falls the wrong side of the keyset predicate and is never
  // served. These three rows differ only below the millisecond.
  it('pages through sub-millisecond createdAt differences', async () => {
    setAuth('user_owner')
    const base = new Date(Date.now() - 60_000)
    for (const [index, title] of ['us a', 'us b', 'us c'].entries()) {
      const row = await seedUserNotification('user_owner', { title })
      await testDb.execute(
        sql`update notifications set created_at = ${base.toISOString()}::timestamptz + ${`${index * 100} microseconds`}::interval where id = ${row.id}`,
      )
    }

    const seen = await pageAll(3)
    expect(seen).toHaveLength(3)
    expect([...seen].sort()).toEqual(['us a', 'us b', 'us c'])
  })

  it('rejects a malformed cursor', async () => {
    setAuth('user_owner')
    const res = await app.request('/v1/notifications?cursor=not-a-cursor')
    expect(res.status).toBe(400)
  })

  // Half a cursor is not a representable request, but a hand-built one with a
  // bad id half still must not silently degrade to "page one".
  it('rejects a cursor whose id half is not a uuid', async () => {
    setAuth('user_owner')
    const forged = Buffer.from('2026-08-01 00:00:00+00|nope', 'utf8').toString(
      'base64url',
    )
    const res = await app.request(`/v1/notifications?cursor=${forged}`)
    expect(res.status).toBe(400)
  })

  // The timestamp half is cast with `::timestamptz`. A value that decodes but
  // cannot cast would reach Postgres and come back as a 500 "Read failed",
  // which tells the client nothing about what it actually got wrong.
  it('rejects a cursor whose timestamp half is not castable', async () => {
    setAuth('user_owner')
    const forged = Buffer.from(
      `not-a-timestamp|${crypto.randomUUID()}`,
      'utf8',
    ).toString('base64url')
    const res = await app.request(`/v1/notifications?cursor=${forged}`)
    expect(res.status).toBe(400)
  })

  it('rejects an invalid limit', async () => {
    setAuth('user_owner')
    const res = await app.request('/v1/notifications?limit=999')
    expect(res.status).toBe(400)
  })

  it('parses metadata into an object and degrades malformed JSON to null', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', {
      title: 'good metadata',
      metadata: JSON.stringify({ submissionId: 'abc' }),
      createdAt: new Date(Date.now() - 60_000),
    })
    await seedUserNotification('user_owner', {
      title: 'bad metadata',
      metadata: '{not json',
      createdAt: new Date(Date.now() - 120_000),
    })
    const body = await getList()
    expect(body.data.items[0]?.metadata).toEqual({ submissionId: 'abc' })
    expect(body.data.items[1]?.metadata).toBeNull()
  })

  it('returns an unknown category raw rather than dropping the row', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', { category: 'watch.teleported' })
    const body = await getList()
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0]?.category).toBe('watch.teleported')
  })

  it('returns the true uncapped unread count over the backfill window', async () => {
    setAuth('user_owner')
    for (let i = 0; i < 25; i += 1) {
      await seedUserNotification('user_owner', {
        title: `unread ${i}`,
        createdAt: new Date(Date.now() - i * 60_000),
      })
    }
    await seedUserNotification('user_owner', {
      title: 'already read',
      readAt: new Date(),
    })
    await seedUserNotification('user_owner', {
      title: 'out of window',
      createdAt: new Date(
        Date.now() - (NOTIFICATION_BACKFILL_DAYS + 1) * DAY_MS,
      ),
    })
    const body = await getList()
    expect(body.data.unreadCount).toBe(25)
  })
})

describe('POST /v1/notifications/:id/read', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  const markRead = (id: string) =>
    app.request(`/v1/notifications/${id}/read`, { method: 'POST' })

  it('returns 401 when unauthenticated', async () => {
    const row = await seedUserNotification('user_owner')
    const res = await markRead(row.id)
    expect(res.status).toBe(401)
  })

  it('marks only the targeted row', async () => {
    setAuth('user_owner')
    const target = await seedUserNotification('user_owner', { title: 'target' })
    const other = await seedUserNotification('user_owner', { title: 'other' })
    const res = await markRead(target.id)
    expect(res.status).toBe(200)
    const body = await getList()
    const byTitle = new Map(body.data.items.map((item) => [item.title, item]))
    expect(byTitle.get('target')?.readAt).not.toBeNull()
    expect(byTitle.get('other')?.readAt).toBeNull()
    expect(other.readAt).toBeNull()
  })

  it('is idempotent — a second call keeps the original readAt', async () => {
    setAuth('user_owner')
    const row = await seedUserNotification('user_owner')
    await markRead(row.id)
    const first = await getList()
    const firstReadAt = first.data.items[0]?.readAt
    expect(firstReadAt).not.toBeNull()
    const second = await markRead(row.id)
    expect(second.status).toBe(200)
    const after = await getList()
    expect(after.data.items[0]?.readAt).toBe(firstReadAt)
  })

  it('returns 404 for another user row', async () => {
    setAuth('user_owner')
    const row = await seedUserNotification('user_other')
    const res = await markRead(row.id)
    expect(res.status).toBe(404)
  })

  it('returns 400 for a non-UUID id', async () => {
    setAuth('user_owner')
    const res = await markRead('not-a-uuid')
    expect(res.status).toBe(400)
  })
})

describe('POST /v1/notifications/read-all', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  const readAll = () =>
    app.request('/v1/notifications/read-all', { method: 'POST' })

  it('returns 401 when unauthenticated', async () => {
    const res = await readAll()
    expect(res.status).toBe(401)
  })

  it('is not swallowed by the /:id/read route', async () => {
    setAuth('user_owner')
    const res = await readAll()
    // A 400 here would mean Hono matched `read-all` as the `:id` param.
    expect(res.status).toBe(200)
  })

  it('marks every unread in-window row for that user only', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner', { title: 'a' })
    await seedUserNotification('user_owner', { title: 'b' })
    await seedUserNotification('user_other', { title: 'theirs' })
    const res = await readAll()
    const body = await parseBody(res, updatedBodySchema)
    expect(body.data.updated).toBe(2)
    const list = await getList()
    expect(list.data.unreadCount).toBe(0)
    expect(list.data.items.every((item) => item.readAt !== null)).toBe(true)

    setAuth('user_other')
    const theirs = await getList()
    expect(theirs.data.unreadCount).toBe(1)
  })

  it('is idempotent — a second call updates nothing', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner')
    await readAll()
    const res = await readAll()
    const body = await parseBody(res, updatedBodySchema)
    expect(body.data.updated).toBe(0)
  })
})

describe('POST /v1/notifications/mark-panel-seen', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  const markSeen = () =>
    app.request('/v1/notifications/mark-panel-seen', { method: 'POST' })

  it('returns 401 when unauthenticated', async () => {
    const res = await markSeen()
    expect(res.status).toBe(401)
  })

  it('creates the user_profiles row when absent', async () => {
    setAuth('user_owner')
    const before = await getList()
    expect(before.data.seenAt).toBeNull()
    const res = await markSeen()
    expect(res.status).toBe(200)
    const [profile] = await testDb
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, 'user_owner'))
    expect(profile?.notificationsSeenAt).not.toBeNull()
  })

  it('advances the watermark on an existing profile', async () => {
    setAuth('user_owner')
    await seedUserProfile('user_owner', {
      notificationsSeenAt: new Date(Date.now() - DAY_MS),
    })
    await markSeen()
    const body = await getList()
    expect(body.data.seenAt).not.toBeNull()
    expect(new Date(body.data.seenAt ?? 0).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    )
  })

  // The conflict path runs `greatest(notifications_seen_at, now())` against a
  // profile that predates the column, where the existing value is NULL.
  // Postgres `greatest()` ignores NULL arguments (it returns NULL only when
  // every argument is NULL), so the first panel open still stamps a watermark.
  it('stamps the watermark on an existing profile that has never seen the panel', async () => {
    setAuth('user_owner')
    await seedUserProfile('user_owner', { notificationsSeenAt: null })
    const before = await getList()
    expect(before.data.seenAt).toBeNull()
    await markSeen()
    const body = await getList()
    expect(body.data.seenAt).not.toBeNull()
  })

  it('never moves the watermark backwards', async () => {
    setAuth('user_owner')
    const future = new Date(Date.now() + 10 * 60_000)
    await seedUserProfile('user_owner', { notificationsSeenAt: future })
    await markSeen()
    const body = await getList()
    expect(body.data.seenAt).toBe(future.toISOString())
  })

  it('does not touch readAt on any row', async () => {
    setAuth('user_owner')
    await seedUserNotification('user_owner')
    await markSeen()
    const body = await getList()
    expect(body.data.unreadCount).toBe(1)
    expect(body.data.items[0]?.readAt).toBeNull()
  })
})
