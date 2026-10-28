// Integration test for the 90-day purge's concert-history branch (#70).
// The DB is real: attendance-only rows must be deleted outright while
// watched-and-attending rows must survive with only `attending_at` cleared,
// because Watching is a Free feature and must never be purged.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        publicMetadata: {},
        primaryEmailAddressId: null,
        emailAddresses: [],
        externalAccounts: [],
      }),
    },
  }),
}))

import { and, eq } from 'drizzle-orm'
import {
  giftedComps,
  subscriptionEvents,
  subscriptions,
  userBilling,
  userEvents,
} from '@concert-crawl/db'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'
import { runNinetyDayPurge } from './billing-daily.js'

const USER_ID = 'user_purge_history'
const NOW = new Date('2026-08-01T00:00:00.000Z')

const resetBillingTables = async (): Promise<void> => {
  await testDb.delete(subscriptionEvents)
  await testDb.delete(subscriptions)
  await testDb.delete(userBilling)
  await testDb.delete(giftedComps)
}

describe('runNinetyDayPurge — concert history', () => {
  beforeEach(async () => {
    await clearTables()
    await resetBillingTables()
  })

  afterEach(resetBillingTables)

  it('deletes attendance-only rows and only clears attending_at on watched rows', async () => {
    const venue = await seedVenue({ name: 'Purge Hall', slug: 'purge-hall' })
    const attendedOnlyA = await seedEvent(venue.id, { date: '2026-01-01' })
    const attendedOnlyB = await seedEvent(venue.id, { date: '2026-01-02' })
    const watchedAndAttended = await seedEvent(venue.id, { date: '2026-01-03' })
    const watchedOnly = await seedEvent(venue.id, { date: '2099-01-04' })

    await testDb.insert(userEvents).values([
      {
        userId: USER_ID,
        eventId: attendedOnlyA.id,
        status: null,
        attendingAt: NOW,
      },
      {
        userId: USER_ID,
        eventId: attendedOnlyB.id,
        status: null,
        attendingAt: NOW,
      },
      {
        userId: USER_ID,
        eventId: watchedAndAttended.id,
        status: 'watching',
        attendingAt: NOW,
      },
      { userId: USER_ID, eventId: watchedOnly.id, status: 'watching' },
    ])

    await testDb.insert(userBilling).values({
      userId: USER_ID,
      premiumDataExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    await runNinetyDayPurge(NOW)

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, USER_ID))

    // Both attendance-only rows are gone; the two watched rows survive.
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.eventId).sort()).toEqual(
      [watchedAndAttended.id, watchedOnly.id].sort(),
    )
    for (const row of rows) {
      expect(row.status).toBe('watching')
      expect(row.attendingAt).toBeNull()
    }

    const [event] = await testDb
      .select()
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.userId, USER_ID),
          eq(subscriptionEvents.type, 'data_purged'),
        ),
      )
    expect(event?.metadata).toMatchObject({ attendedHistory: 3 })
  })

  it('keeps everything for a cancelled Supporter who holds a live gift (#1229)', async () => {
    const venue = await seedVenue({ name: 'Gift Hall', slug: 'gift-hall' })
    const attended = await seedEvent(venue.id, { date: '2026-01-06' })
    await testDb.insert(userEvents).values({
      userId: USER_ID,
      eventId: attended.id,
      status: null,
      attendingAt: NOW,
    })
    // Supporter cancelled 90+ days ago, so the clock has elapsed, but a
    // Premium gift is still live and grants Concerts regardless.
    await testDb.insert(userBilling).values({
      userId: USER_ID,
      premiumDataExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
    })
    await testDb.insert(giftedComps).values({
      userId: USER_ID,
      grantedBy: 'admin_test',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    })

    await runNinetyDayPurge(NOW)

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, USER_ID))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.attendingAt).not.toBeNull()
  })

  it("deletes legacy status='going' attended rows instead of half-clearing them", async () => {
    const venue = await seedVenue({ name: 'Legacy Hall', slug: 'legacy-hall' })
    const legacy = await seedEvent(venue.id, { date: '2026-01-05' })

    // 0064 backfilled attending_at onto legacy 'going' rows but left the status
    // in place until 0065 contracts it. Such a row carries no Free Watching
    // relationship, so nulling attending_at alone would leave the attendance
    // still readable through the legacy status.
    await testDb.insert(userEvents).values({
      userId: USER_ID,
      eventId: legacy.id,
      status: 'going',
      attendingAt: NOW,
    })

    await testDb.insert(userBilling).values({
      userId: USER_ID,
      premiumDataExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    await runNinetyDayPurge(NOW)

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, USER_ID))
    expect(rows).toHaveLength(0)
  })
})
