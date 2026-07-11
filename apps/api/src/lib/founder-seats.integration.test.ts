// Integration tests for restoreFounderSeat concurrency safety (eng infra
// spec Part 2 §3.2): at most one restore per claim even when an abandon
// call races the incomplete_expired/deleted webhooks.

import { describe, it, expect, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { founderWindow, subscriptionEvents } from '@concert-crawl/db'
import { restoreFounderSeat } from './founder-seats.js'
import { testDb } from '../test/helpers/db.js'

async function seedFounderWindow(seatsRemaining: number): Promise<void> {
  const values = {
    opensAt: new Date(),
    seatsTotal: 100,
    seatsRemaining,
    seatsRemainingTest: 100,
    windowDays: 30,
  }
  await testDb
    .insert(founderWindow)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: founderWindow.id, set: values })
}

async function readSeatsRemaining(): Promise<number> {
  const [row] = await testDb
    .select({ seatsRemaining: founderWindow.seatsRemaining })
    .from(founderWindow)
    .where(eq(founderWindow.id, 1))
  if (!row) throw new Error('founder_window singleton row missing')
  return row.seatsRemaining
}

describe('restoreFounderSeat under concurrency', () => {
  beforeEach(async () => {
    await testDb.execute(sql`TRUNCATE subscription_events`)
    await seedFounderWindow(50)
  })

  it('restores exactly once when N callers race the same claim', async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () =>
        restoreFounderSeat({
          userId: 'user_race_1',
          subscriptionId: 'sub_race_1',
          seatNumber: 51,
          reason: 'checkout_abandoned',
        }),
      ),
    )

    expect(outcomes.filter((outcome) => outcome === 'restored')).toHaveLength(1)
    expect(
      outcomes.filter((outcome) => outcome === 'already_restored'),
    ).toHaveLength(9)
    expect(await readSeatsRemaining()).toBe(51)

    const restores = await testDb
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.type, 'founder_seat_restored'))
    expect(restores).toHaveLength(1)
  })

  it('restores independent claims concurrently without losing increments', async () => {
    const claims = Array.from({ length: 5 }, (_unused, idx) => ({
      userId: `user_race_multi_${idx}`,
      subscriptionId: `sub_race_multi_${idx}`,
      seatNumber: 60 + idx,
      reason: 'never_paid_deleted' as const,
    }))
    const outcomes = await Promise.all(
      claims.map((claim) => restoreFounderSeat(claim)),
    )

    expect(outcomes.every((outcome) => outcome === 'restored')).toBe(true)
    expect(await readSeatsRemaining()).toBe(55)

    const restores = await testDb
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.type, 'founder_seat_restored'))
    expect(restores).toHaveLength(5)
  })
})
