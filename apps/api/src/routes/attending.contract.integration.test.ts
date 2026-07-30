// Contract guard for the #70 retirement of `status = 'going'` (migration 0065).
//
// 0065 nulls out every legacy 'going' row. The value stays in the
// user_event_status enum — removing it would mean recreating the type — so it
// remains *writable* even though nothing should write it. This test is the thing
// standing between that and a silent regression: a reintroduced 'going' write
// would leave attendance invisible to /v1/history, which reads
// `attending_at IS NOT NULL`, and to the 90-day purge in billing-daily.
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

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { subscriptions, userEvents } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()
const USER_ID = 'user_going_contract'

const goingRowCount = async (): Promise<number> => {
  const rows = await testDb
    .select({ status: userEvents.status })
    .from(userEvents)
    .where(eq(userEvents.status, 'going'))
  return rows.length
}

describe("no shipped writer produces status = 'going'", () => {
  beforeEach(async () => {
    authState.current = { userId: USER_ID, sessionClaims: {} }
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
    await testDb.insert(subscriptions).values({
      userId: USER_ID,
      stripeCustomerId: `cus_${USER_ID}`,
      stripeSubscriptionId: `sub_${USER_ID}`,
      tier: 'supporter',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    })
  })

  it('leaves zero going rows after every watch and attendance transition', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const eventId = event.id
    const unwatched = await seedEvent(venue.id, { artist: 'Never Watched' })

    // The full lifecycle, in the order a real user drives it: watch, mark
    // going, unmark, unwatch — then mark going on a second show that was never
    // watched, which takes the insert-fresh-row path rather than the update path.
    const calls: readonly [string, string][] = [
      ['PUT', `/v1/watching/${eventId}`],
      ['PUT', `/v1/attending/${eventId}`],
      ['DELETE', `/v1/attending/${eventId}`],
      ['PUT', `/v1/watching/${eventId}`],
      ['PUT', `/v1/attending/${unwatched.id}`],
    ]

    for (const [method, path] of calls) {
      const res = await app.request(path, { method })
      expect(res.status, `${method} ${path}`).toBeLessThan(400)
      expect(await goingRowCount()).toBe(0)
    }
  })

  it('has no going literal left in either seed source', async () => {
    const sources = [
      '../../../../packages/db/seed.ts',
      '../../../../scripts/seed-staging/generators/user-events.ts',
    ]

    for (const relative of sources) {
      const path = fileURLToPath(new URL(relative, import.meta.url))
      const text = await readFile(path, 'utf8')
      // Both files name the retired value in a comment explaining the
      // retirement, so comments are stripped before the check — otherwise the
      // documentation would be the thing failing the test.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      // Every quote style, not just the one Prettier happens to enforce today —
      // a guard that only catches the formatted spelling is no guard at all.
      expect(code, path).not.toMatch(/status:\s*['"`]going['"`]/)
    }
  })
})
