import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { auditLog, inboxReads, inboxReadWatermarks } from '@concert-crawl/db'
import type { InboxItemType } from '@concert-crawl/types'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedInboxRead,
  seedInboxWatermark,
  seedNotification,
  seedPriceSubmission,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'

const app = createApp()

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

interface InboxItem {
  itemType: InboxItemType
  itemId: string
  title: string
  body: string
  actionUrl: string
  sourceCreatedAt: string
  readAt: string | null
}

interface InboxData {
  items: InboxItem[]
  total?: number
  unreadCounts: Record<InboxItemType, number>
}

async function getInbox(query = ''): Promise<InboxData> {
  const res = await app.request(`/v1/admin/inbox${query}`, {
    headers: ADMIN_HEADERS,
  })
  expect(res.status).toBe(200)
  const body = (await res.json()) as { success: boolean; data: InboxData }
  expect(body.success).toBe(true)
  return body.data
}

// Mark the current occurrence of an item read the way a real client does —
// echoing back the exact sourceCreatedAt the GET endpoint served. This avoids
// depending on sub-millisecond precision quirks between the DB timestamp and
// its JS round-trip; the router serves timestamptz(3) and stores the same.
async function markReadViaApi(item: InboxItem): Promise<void> {
  const res = await app.request('/v1/admin/inbox/read', {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      itemType: item.itemType,
      itemId: item.itemId,
      sourceCreatedAt: item.sourceCreatedAt,
    }),
  })
  expect(res.status).toBe(200)
}

describe('GET /v1/admin/inbox', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('surfaces an unverified event as an event_flag item', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })

    const data = await getInbox()
    const item = data.items.find((row) => row.itemType === 'event_flag')
    expect(item).toBeDefined()
    expect(item?.itemId).toBe(event.id)
    expect(item?.actionUrl).toBe('/admin/review')
    expect(item?.readAt).toBeNull()
  })

  it('surfaces a pending price submission (excludes contest counters)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: true })
    const submission = await seedPriceSubmission(event.id, 'submitter', {
      status: 'pending',
    })
    // Contest counter — must NOT appear.
    const parent = await seedPriceSubmission(event.id, 'parent', {
      status: 'corroborated',
      priceMin: '40',
    })
    await seedPriceSubmission(event.id, 'challenger', {
      status: 'pending',
      priceMin: '55',
      disputedSubmissionId: parent.id,
    })

    const data = await getInbox('?category=price_submission&status=all')
    const ids = data.items.map((row) => row.itemId)
    expect(ids).toContain(submission.id)
    expect(data.items).toHaveLength(1)
  })

  it('surfaces a blocked venue', async () => {
    const venue = await seedVenue({ blockedAt: new Date() })

    const data = await getInbox('?category=blocked_venue')
    expect(data.items).toHaveLength(1)
    expect(data.items[0]?.itemId).toBe(venue.id)
    expect(data.items[0]?.actionUrl).toBe('/admin/venues')
  })

  it('surfaces a crawl failure notification', async () => {
    const notification = await seedNotification({
      type: 'admin_alert',
      category: 'crawl.failed',
    })

    const data = await getInbox('?category=crawl_failure')
    expect(data.items).toHaveLength(1)
    expect(data.items[0]?.itemId).toBe(notification.id)
    expect(data.items[0]?.actionUrl).toBe('/admin/crawl')
  })

  it('returns all categories when category is omitted', async () => {
    const venue = await seedVenue({ blockedAt: new Date() })
    await seedEvent(venue.id, { verified: false })
    await seedNotification({ category: 'crawl.failed' })

    const data = await getInbox('?status=all')
    const types = new Set(data.items.map((row) => row.itemType))
    expect(types.has('event_flag')).toBe(true)
    expect(types.has('blocked_venue')).toBe(true)
    expect(types.has('crawl_failure')).toBe(true)
  })

  it('filters to a single category when category is provided', async () => {
    const venue = await seedVenue({ blockedAt: new Date() })
    await seedEvent(venue.id, { verified: false })

    const data = await getInbox('?category=event_flag&status=all')
    expect(data.items.every((row) => row.itemType === 'event_flag')).toBe(true)
  })

  it('defaults status to unread', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })
    // Mark the current occurrence read via the real GET→POST round-trip.
    const before = await getInbox('?category=event_flag&status=unread')
    const item = before.items[0]
    expect(item).toBeDefined()
    if (item) await markReadViaApi(item)

    const data = await getInbox('?category=event_flag')
    expect(data.items).toHaveLength(0)
  })

  it('derives readAt from an inbox_reads row (status=read)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })
    const before = await getInbox('?category=event_flag&status=unread')
    const item = before.items[0]
    expect(item).toBeDefined()
    if (item) await markReadViaApi(item)

    const data = await getInbox('?category=event_flag&status=read')
    expect(data.items).toHaveLength(1)
    expect(data.items[0]?.readAt).not.toBeNull()
  })

  it('derives readAt from a watermark covering the occurrence', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })
    // Watermark strictly after the event's occurrence timestamp.
    const readUpTo = new Date(event.updatedAt.getTime() + 60_000)
    await seedInboxWatermark('event_flag', readUpTo)

    const readData = await getInbox('?category=event_flag&status=read')
    expect(readData.items).toHaveLength(1)
    expect(readData.items[0]?.readAt).not.toBeNull()

    const unreadData = await getInbox('?category=event_flag&status=unread')
    expect(unreadData.items).toHaveLength(0)
  })

  // Recurrence: a stale mark from an earlier occurrence must NOT mask a fresh
  // occurrence carrying a newer source_created_at.
  it('re-enters as unread when the occurrence timestamp advances past a stale mark', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })

    // Mark read at an OLDER occurrence timestamp than the event now carries.
    const staleOccurrence = new Date(event.updatedAt.getTime() - 60_000)
    await seedInboxRead('event_flag', event.id, staleOccurrence)

    // The current occurrence (event.updatedAt) has no matching read row, so it
    // is still unread despite the stale mark.
    const data = await getInbox('?category=event_flag&status=unread')
    expect(data.items).toHaveLength(1)
    expect(data.items[0]?.itemId).toBe(event.id)
    expect(data.items[0]?.readAt).toBeNull()
  })

  it('omits total when count is not requested', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })

    const data = await getInbox('?category=event_flag&status=all')
    expect(data.total).toBeUndefined()
  })

  it('includes total when count=true', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })
    await seedEvent(venue.id, { artist: 'Second', verified: false })

    const data = await getInbox(
      '?category=event_flag&status=all&count=true&limit=1',
    )
    expect(data.total).toBe(2)
    // total ignores limit
    expect(data.items).toHaveLength(1)
  })

  it('omits total when count=false', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })

    const data = await getInbox('?category=event_flag&status=all&count=false')
    expect(data.total).toBeUndefined()
  })

  it('computes unreadCounts across the full inbox regardless of filters', async () => {
    const venue = await seedVenue({ blockedAt: new Date() })
    await seedEvent(venue.id, { verified: false })
    await seedEvent(venue.id, { artist: 'Two', verified: false })
    await seedNotification({ category: 'crawl.failed' })

    // Filter to a single category — unreadCounts should still cover all.
    const data = await getInbox('?category=blocked_venue')
    expect(data.unreadCounts.event_flag).toBe(2)
    expect(data.unreadCounts.blocked_venue).toBe(1)
    expect(data.unreadCounts.crawl_failure).toBe(1)
    expect(data.unreadCounts.price_submission).toBe(0)
  })

  it('excludes read occurrences from unreadCounts', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { verified: false })
    const before = await getInbox('?category=event_flag&status=unread')
    const item = before.items[0]
    expect(item).toBeDefined()
    if (item) await markReadViaApi(item)

    const data = await getInbox()
    expect(data.unreadCounts.event_flag).toBe(0)
  })

  it('orders items by sourceCreatedAt descending', async () => {
    const venue = await seedVenue()
    const older = await seedEvent(venue.id, {
      artist: 'Older',
      verified: false,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })
    const newer = await seedEvent(venue.id, {
      artist: 'Newer',
      verified: false,
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    })

    const data = await getInbox('?category=event_flag&status=all')
    expect(data.items[0]?.itemId).toBe(newer.id)
    expect(data.items[1]?.itemId).toBe(older.id)
  })
})

describe('POST /v1/admin/inbox/read', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('marks a single occurrence read and persists the row', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })

    // Echo back the exact sourceCreatedAt the GET endpoint serves.
    const before = await getInbox('?category=event_flag&status=unread')
    const item = before.items[0]
    expect(item).toBeDefined()
    if (item) await markReadViaApi(item)

    const rows = await testDb
      .select()
      .from(inboxReads)
      .where(eq(inboxReads.itemId, event.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.readBy).toBe('admin_user')

    // It should now be gone from the unread list.
    const data = await getInbox('?category=event_flag&status=unread')
    expect(data.items).toHaveLength(0)
  })

  it('is idempotent — a second read no-ops at the row level', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })
    const payload = {
      itemType: 'event_flag',
      itemId: event.id,
      sourceCreatedAt: event.updatedAt.toISOString(),
    }

    await app.request('/v1/admin/inbox/read', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify(payload),
    })
    const res2 = await app.request('/v1/admin/inbox/read', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify(payload),
    })
    expect(res2.status).toBe(200)

    const rows = await testDb
      .select()
      .from(inboxReads)
      .where(eq(inboxReads.itemId, event.id))
    expect(rows).toHaveLength(1)
  })

  it('writes an audit_log entry', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { verified: false })

    await app.request('/v1/admin/inbox/read', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        itemType: 'event_flag',
        itemId: event.id,
        sourceCreatedAt: event.updatedAt.toISOString(),
      }),
    })

    const rows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'inbox.mark_read'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.actorId).toBe('admin_user')
    expect(rows[0]?.targetId).toBe(event.id)
  })

  it('rejects an invalid itemType with 422', async () => {
    const res = await app.request('/v1/admin/inbox/read', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        itemType: 'not_a_type',
        itemId: 'abc',
        sourceCreatedAt: new Date().toISOString(),
      }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects a non-datetime sourceCreatedAt with 422', async () => {
    const res = await app.request('/v1/admin/inbox/read', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        itemType: 'event_flag',
        itemId: 'abc',
        sourceCreatedAt: 'not-a-date',
      }),
    })
    expect(res.status).toBe(422)
  })
})

describe('POST /v1/admin/inbox/read-all', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('marks older occurrences read via watermark, leaves newer unread', async () => {
    const venue = await seedVenue()
    const older = await seedEvent(venue.id, {
      artist: 'Older',
      verified: false,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })

    const res = await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ category: 'event_flag' }),
    })
    expect(res.status).toBe(200)

    // A watermark row now exists for event_flag.
    const marks = await testDb
      .select()
      .from(inboxReadWatermarks)
      .where(eq(inboxReadWatermarks.itemType, 'event_flag'))
    expect(marks).toHaveLength(1)

    // The older event (before now()) is now read.
    const readData = await getInbox('?category=event_flag&status=read')
    expect(readData.items.map((row) => row.itemId)).toContain(older.id)

    // A future occurrence stays unread.
    const newer = await seedEvent(venue.id, {
      artist: 'Future',
      verified: false,
      updatedAt: new Date('2099-01-01T00:00:00Z'),
    })
    const unreadData = await getInbox('?category=event_flag&status=unread')
    expect(unreadData.items.map((row) => row.itemId)).toContain(newer.id)
  })

  it('marks all categories when category is omitted', async () => {
    const res = await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)

    const marks = await testDb.select().from(inboxReadWatermarks)
    expect(marks).toHaveLength(4)
  })

  it('is idempotent — a second call upserts the same watermark row', async () => {
    await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ category: 'event_flag' }),
    })
    const res2 = await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ category: 'event_flag' }),
    })
    expect(res2.status).toBe(200)

    const marks = await testDb
      .select()
      .from(inboxReadWatermarks)
      .where(eq(inboxReadWatermarks.itemType, 'event_flag'))
    expect(marks).toHaveLength(1)
  })

  it('writes an audit_log entry with the category in meta', async () => {
    await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ category: 'blocked_venue' }),
    })

    const rows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'inbox.mark_all_read'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.actorId).toBe('admin_user')
    expect(rows[0]?.metadata).toMatchObject({ category: 'blocked_venue' })
  })

  it("records category 'all' in meta when omitted", async () => {
    await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })

    const rows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'inbox.mark_all_read'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.metadata).toMatchObject({ category: 'all' })
  })

  it('rejects an invalid category with 422', async () => {
    const res = await app.request('/v1/admin/inbox/read-all', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ category: 'bogus' }),
    })
    expect(res.status).toBe(422)
  })
})
